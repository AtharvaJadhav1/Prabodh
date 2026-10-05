"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDmMessage,
  deleteGroupComment,
  getDmMessages,
  getGroupComments,
  postGroupComment,
  sendDmMessage,
} from "../../lib/chat-api";
import { newClientId } from "../../lib/chat-format";
import type { ChatConversation, ChatMessage, DirectMessage } from "../../lib/chat-types";
import type { PortalComment } from "../../lib/types";
import { useChatPolling } from "./useChatPolling";

const THREAD_POLL_MS = 2_500;
const PAGE = 50;

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function toDm(dm: DirectMessage, conv: ChatConversation, me: string): ChatMessage {
  const mine = dm.senderId === me;
  return {
    key: dm.id,
    id: dm.id,
    clientId: dm.clientId,
    senderId: dm.senderId,
    senderName: mine ? "You" : conv.title,
    senderRole: null,
    senderAvatarUrl: mine ? null : (conv.person?.avatarUrl ?? conv.avatarUrl),
    senderEmail: null,
    body: dm.deleted ? "" : dm.body,
    createdAt: dm.createdAt,
    deleted: dm.deleted,
    mine,
    status: mine ? (dm.readAt ? "read" : "sent") : "sent",
  };
}

function toGroup(c: PortalComment, me: string): ChatMessage {
  const mine = !!c.author?.id && c.author.id === me;
  return {
    key: c.id,
    id: c.id,
    clientId: null,
    senderId: c.author?.id ?? "unknown",
    senderName: mine ? "You" : (c.author?.fullName ?? "Member"),
    senderRole: c.author?.platformRole ?? null,
    senderAvatarUrl: c.author?.avatarUrl ?? null,
    senderEmail: c.author?.email ?? null,
    body: c.message,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt as unknown as string).toISOString(),
    deleted: false,
    mine,
    status: "sent",
  };
}

function flattenComments(list: PortalComment[], me: string): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const c of list) {
    out.push(toGroup(c, me));
    for (const r of c.replies ?? []) out.push(toGroup(r, me));
  }
  return out;
}

function sortMessages(list: ChatMessage[]): ChatMessage[] {
  const server = list.filter((m) => m.id !== null);
  const pending = list.filter((m) => m.id === null);
  const cmp = (a: ChatMessage, b: ChatMessage) => {
    const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (d !== 0 && !Number.isNaN(d)) return d;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  };
  return [...server.sort(cmp), ...pending.sort(cmp)];
}

/** Merge server messages into local state, dropping the optimistic copy they replace. */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of prev) map.set(m.key, m);
  for (const inc of incoming) {
    if (inc.clientId && map.get(inc.clientId)?.id === null) map.delete(inc.clientId);
    map.set(inc.key, inc);
  }
  return sortMessages([...map.values()]);
}

export type ThreadApi = ReturnType<typeof useThread>;

export function useThread(
  conv: ChatConversation,
  me: string,
  meName: string,
  onActivity: (preview: string, createdAt: string) => void,
) {
  const isDm = conv.type === "dm";
  const peerId = conv.person?.id ?? (conv.id.startsWith("dm:") ? conv.id.slice(3) : "");
  const teamId = conv.teamId ?? (conv.id.startsWith("team:") ? conv.id.slice(5) : "");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const initialised = useRef(false);
  const mounted = useRef(true);
  const removed = useRef(new Set<string>());
  const convRef = useRef(conv);
  const activityRef = useRef(onActivity);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    convRef.current = conv;
    activityRef.current = onActivity;
  });

  const poll = useCallback(
    async (signal: AbortSignal) => {
      const cur = convRef.current;
      if (isDm) {
        if (!peerId) return;
        const cursor = [...messagesRef.current].reverse().find((m) => m.id !== null)?.id ?? undefined;
        // Read ticks and deletions only show up on a full refresh, so do one while any
        // of my messages is still unread by the other person.
        const needsFull = messagesRef.current.some((m) => m.mine && m.id !== null && m.status === "sent");
        const useAfter = initialised.current && !!cursor && !needsFull;
        const res = await getDmMessages(peerId, { signal, limit: PAGE, after: useAfter ? cursor : undefined });
        if (!mounted.current) return;
        const incoming = (res.items ?? []).map((d) => toDm(d, cur, me));
        setMessages((prev) => mergeMessages(prev, incoming));
        if (!initialised.current) setHasMore(!!res.hasMore);
      } else {
        if (!teamId) return;
        const list = await getGroupComments(teamId, { signal });
        if (!mounted.current) return;
        const incoming = flattenComments(list ?? [], me).filter((m) => !removed.current.has(m.key));
        setMessages((prev) => {
          const pending = prev.filter((m) => m.id === null);
          const kept = pending.filter(
            (p) => !(p.status === "sending" && incoming.some((i) => i.mine && i.body === p.body)),
          );
          return sortMessages([...incoming, ...kept]);
        });
      }
      initialised.current = true;
      setError(null);
      setLoading(false);
    },
    [isDm, peerId, teamId, me],
  );

  const { refresh } = useChatPolling(
    poll,
    {
      intervalMs: THREAD_POLL_MS,
      onError: (err) => {
        if (!mounted.current) return;
        setLoading(false);
        setError(errMsg(err, "Could not load messages."));
      },
    },
    conv.id,
  );

  const loadOlder = useCallback(async () => {
    if (!isDm || !peerId || loadingOlder || !hasMore) return;
    const first = messagesRef.current.find((m) => m.id !== null)?.id;
    if (!first) return;
    setLoadingOlder(true);
    try {
      const res = await getDmMessages(peerId, { before: first, limit: PAGE });
      if (!mounted.current) return;
      const older = (res.items ?? []).map((d) => toDm(d, convRef.current, me));
      setMessages((prev) => mergeMessages(prev, older));
      setHasMore(!!res.hasMore);
    } catch (err) {
      if (mounted.current) setActionError(errMsg(err, "Could not load earlier messages."));
    } finally {
      if (mounted.current) setLoadingOlder(false);
    }
  }, [isDm, peerId, loadingOlder, hasMore, me]);

  const deliver = useCallback(
    async (clientId: string, text: string) => {
      try {
        let saved: ChatMessage;
        if (isDm) {
          const dm = await sendDmMessage(peerId, text, clientId);
          saved = toDm(dm, convRef.current, me);
        } else {
          const c = await postGroupComment(teamId, text);
          saved = toGroup(c, me);
          saved.mine = true;
          saved.senderName = "You";
        }
        if (!mounted.current) return;
        setMessages((prev) => mergeMessages(
          prev.filter((m) => m.key !== clientId),
          [saved],
        ));
        activityRef.current(text, saved.createdAt);
      } catch (err) {
        if (!mounted.current) return;
        setMessages((prev) => prev.map((m) => (m.key === clientId ? { ...m, status: "failed" } : m)));
        setActionError(errMsg(err, "Message not sent."));
      }
    },
    [isDm, peerId, teamId, me],
  );

  const send = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) return;
      const clientId = newClientId();
      const createdAt = new Date().toISOString();
      setActionError(null);
      setMessages((prev) =>
        sortMessages([
          ...prev,
          {
            key: clientId,
            id: null,
            clientId,
            senderId: me,
            senderName: meName || "You",
            senderRole: null,
            senderAvatarUrl: null,
            senderEmail: null,
            body,
            createdAt,
            deleted: false,
            mine: true,
            status: "sending",
          },
        ]),
      );
      activityRef.current(body, createdAt);
      void deliver(clientId, body);
    },
    [deliver, me, meName],
  );

  const retry = useCallback(
    (key: string) => {
      const m = messagesRef.current.find((x) => x.key === key);
      if (!m || m.id !== null) return;
      setActionError(null);
      setMessages((prev) => prev.map((x) => (x.key === key ? { ...x, status: "sending" } : x)));
      void deliver(key, m.body);
    },
    [deliver],
  );

  const discard = useCallback((key: string) => {
    setMessages((prev) => prev.filter((m) => m.key !== key));
  }, []);

  const remove = useCallback(
    async (key: string) => {
      const m = messagesRef.current.find((x) => x.key === key);
      if (!m || !m.id || !m.mine) return;
      setActionError(null);
      if (isDm) {
        setMessages((prev) => prev.map((x) => (x.key === key ? { ...x, deleted: true, body: "" } : x)));
        try {
          await deleteDmMessage(m.id);
        } catch (err) {
          if (!mounted.current) return;
          setMessages((prev) => prev.map((x) => (x.key === key ? m : x)));
          setActionError(errMsg(err, "Could not delete the message."));
        }
      } else {
        removed.current.add(key);
        setMessages((prev) => prev.filter((x) => x.key !== key));
        try {
          await deleteGroupComment(teamId, m.id);
        } catch (err) {
          removed.current.delete(key);
          if (!mounted.current) return;
          setMessages((prev) => mergeMessages(prev, [m]));
          setActionError(errMsg(err, "Could not delete the message."));
        }
      }
    },
    [isDm, teamId],
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    actionError,
    clearActionError: () => setActionError(null),
    refresh,
    loadOlder,
    send,
    retry,
    discard,
    remove,
  };
}
