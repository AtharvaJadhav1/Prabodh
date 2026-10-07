"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRefresh } from "../../lib/app-refresh";
import { listConversations } from "../../lib/chat-api";
import type { ChatConversation } from "../../lib/chat-types";
import { setChatUnreadTotal } from "./chatUnreadStore";
import { useChatPolling } from "./useChatPolling";

const LIST_POLL_MS = 8_000;
const SUPPRESS_MS = 8_000;

function sortConversations(items: ChatConversation[]): ChatConversation[] {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (b.pinned && !a.pinned) return 1;
    const at = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime() || 0;
    const bt = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime() || 0;
    return bt - at;
  });
}

export function useConversations(enabled: boolean) {
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Conversations we just marked read: the next list responses may still carry the old count.
  const suppressed = useRef(new Map<string, number>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const apply = useCallback((list: ChatConversation[]) => {
    const now = Date.now();
    const next = sortConversations(
      list.map((c) => {
        const until = suppressed.current.get(c.id);
        if (until === undefined) return c;
        if (until < now) {
          suppressed.current.delete(c.id);
          return c;
        }
        return c.unread > 0 ? { ...c, unread: 0 } : c;
      }),
    );
    setItems(next);
    setChatUnreadTotal(next.reduce((n, c) => n + c.unread, 0));
  }, []);

  const { refresh } = useChatPolling(
    async (signal) => {
      const res = await listConversations({ signal });
      if (!mounted.current) return;
      apply(res.items ?? []);
      setError(null);
      setLoading(false);
    },
    {
      intervalMs: LIST_POLL_MS,
      enabled,
      onError: (err) => {
        if (!mounted.current) return;
        setLoading(false);
        setError(err instanceof Error && err.message ? err.message : "Could not load your chats.");
      },
    },
  );

  // Friend request answered from the notification panel: a new DM may now exist.
  useAppRefresh(["friends"], () => {
    if (enabled) refresh();
  });

  /** Apply a local change (e.g. optimistic preview or unread reset) until the server catches up. */
  const patch = useCallback((id: string, fn: (c: ChatConversation) => ChatConversation) => {
    setItems((prev) => {
      const next = sortConversations(prev.map((c) => (c.id === id ? fn(c) : c)));
      setChatUnreadTotal(next.reduce((n, c) => n + c.unread, 0));
      return next;
    });
  }, []);

  const markReadLocally = useCallback(
    (id: string) => {
      suppressed.current.set(id, Date.now() + SUPPRESS_MS);
      patch(id, (c) => (c.unread === 0 ? c : { ...c, unread: 0 }));
    },
    [patch],
  );

  return { items, loading, error, refresh, patch, markReadLocally };
}
