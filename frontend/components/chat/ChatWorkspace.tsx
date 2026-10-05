"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  markDmRead,
  markGroupRead,
  sendFriendRequest,
  unfriend as unfriendApi,
} from "../../lib/chat-api";
import type { ChatConversation, ChatPerson, Friendship } from "../../lib/chat-types";
import { useAuth } from "../auth/AuthProvider";
import { ChatPeopleProvider, type ChatPeopleActions } from "./chat-context";
import { ChatIcon, CloseIcon, ExpandIcon } from "./chat-icons";
import ConversationList from "./ConversationList";
import ExpandDialog from "./ExpandDialog";
import FriendsPanel from "./FriendsPanel";
import PeoplePanel from "./PeoplePanel";
import PersonProfileSheet from "./PersonProfileSheet";
import ThreadView from "./ThreadView";
import { useConversations } from "./useConversations";
import { useFriendsData } from "./useFriendsData";
import { useViewportFit } from "./useViewportFit";

export type ChatWorkspaceProps = {
  variant: "card" | "page";
  initialConversationId?: string;
  className?: string;
  /** Called whenever a conversation is on screen with unread messages (e.g. to clear legacy notifications). */
  onConversationViewed?: (conv: ChatConversation) => void;
};

type CoreProps = ChatWorkspaceProps & {
  inDialog?: boolean;
  onExpand?: () => void;
  onActiveChange?: (id: string | null) => void;
};

type Tab = "chats" | "friends" | "people";

const TWO_PANE_MIN = 720;
const OVERRIDE_MS = 6_000;

type Override = { value: Friendship; until: number };

function errText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function draftConversation(person: ChatPerson): ChatConversation {
  return {
    id: `dm:${person.id}`,
    type: "dm",
    title: person.fullName,
    subtitle: person.roleLabel,
    avatarUrl: person.avatarUrl,
    person,
    lastMessage: null,
    unread: 0,
    updatedAt: new Date().toISOString(),
  };
}

function ChatWorkspaceCore({
  variant,
  initialConversationId,
  className,
  onConversationViewed,
  inDialog = false,
  onExpand,
  onActiveChange,
}: CoreProps) {
  const { session } = useAuth();
  const me = session?.userId ?? "";
  const meName = session?.fullName ?? "You";

  const rootRef = useRef<HTMLDivElement>(null);
  const threadWrapRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ chats: null, friends: null, people: null });
  const mounted = useRef(true);

  const [width, setWidth] = useState(0);
  const [tab, setTab] = useState<Tab>("chats");
  const [activeId, setActiveIdState] = useState<string | null>(initialConversationId ?? null);
  const [draft, setDraft] = useState<ChatConversation | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  const twoPane = width >= TWO_PANE_MIN;
  const fitHeight = useViewportFit(rootRef, variant === "page" && !inDialog && !twoPane);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === "number") setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const convs = useConversations(!!me);
  const friendsData = useFriendsData(!!me, tab === "friends");

  const setActiveId = useCallback(
    (id: string | null) => {
      setActiveIdState(id);
      onActiveChange?.(id);
    },
    [onActiveChange],
  );

  const activeConv = useMemo<ChatConversation | null>(() => {
    if (!activeId) return null;
    return convs.items.find((c) => c.id === activeId) ?? (draft?.id === activeId ? draft : null);
  }, [activeId, convs.items, draft]);

  // A deep-linked or restored id that the server does not know about (and we have no draft for): drop it.
  const listLoaded = !convs.loading;
  useEffect(() => {
    if (!activeId || activeConv || !listLoaded) return;
    if (activeId.startsWith("dm:")) {
      const f = friendsData.friends.find((x) => `dm:${x.id}` === activeId);
      if (f) {
        setDraft(draftConversation({ ...f, friendship: { status: "friends" } }));
        return;
      }
      if (friendsData.loading) return;
    }
    setActiveId(null);
  }, [activeId, activeConv, listLoaded, friendsData.friends, friendsData.loading, setActiveId]);

  // Auto-dismiss notices.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  // Single-pane: move focus into the thread when it opens.
  useEffect(() => {
    if (!twoPane && activeConv) threadWrapRef.current?.focus({ preventScroll: true });
  }, [twoPane, activeConv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const friendshipOf = useCallback(
    (person: ChatPerson): Friendship => {
      const ov = overrides[person.id];
      if (ov && ov.until > Date.now()) return ov.value;
      if (!friendsData.loading && !friendsData.error) {
        if (friendsData.friends.some((f) => f.id === person.id)) return { status: "friends" };
        const inc = friendsData.requests.incoming.find((r) => r.person.id === person.id);
        if (inc) return { status: "incoming", requestId: inc.id };
        const out = friendsData.requests.outgoing.find((r) => r.person.id === person.id);
        if (out) return { status: "outgoing", requestId: out.id };
        return { status: "none" };
      }
      return person.friendship;
    },
    [overrides, friendsData.loading, friendsData.error, friendsData.friends, friendsData.requests],
  );

  const run = useCallback(
    async (personId: string, task: () => Promise<Friendship | void>, fallback: string) => {
      setBusy((p) => new Set(p).add(personId));
      try {
        const next = await task();
        if (!mounted.current) return;
        if (next) setOverrides((p) => ({ ...p, [personId]: { value: next, until: Date.now() + OVERRIDE_MS } }));
        friendsData.refresh();
      } catch (err) {
        if (mounted.current) setNotice(errText(err, fallback));
      } finally {
        if (mounted.current) {
          setBusy((p) => {
            const n = new Set(p);
            n.delete(personId);
            return n;
          });
        }
      }
    },
    [friendsData],
  );

  const openDm = useCallback(
    (person: ChatPerson) => {
      const id = `dm:${person.id}`;
      const existing = convs.items.find((c) => c.id === id);
      if (!existing) setDraft(draftConversation(person));
      setProfileId(null);
      setTab("chats");
      setActiveId(id);
    },
    [convs.items, setActiveId],
  );

  const actions = useMemo<ChatPeopleActions>(
    () => ({
      friendshipOf,
      isBusy: (id) => busy.has(id),
      openProfile: (id) => setProfileId(id),
      openDm,
      add: (p) =>
        void run(
          p.id,
          async () => {
            const res = await sendFriendRequest(p.id);
            return res.status === "friends" ? { status: "friends" } : { status: "outgoing", requestId: res.id };
          },
          "Could not send the friend request.",
        ),
      cancel: (p, requestId) =>
        void run(
          p.id,
          async () => {
            const id = requestId ?? friendshipOf(p).requestId;
            if (id) {
              await cancelFriendRequest(id);
              friendsData.removeRequest(id);
            }
            return { status: "none" };
          },
          "Could not cancel the request.",
        ),
      accept: (p, requestId) =>
        void run(
          p.id,
          async () => {
            const id = requestId ?? friendshipOf(p).requestId;
            if (!id) throw new Error("This request is no longer available.");
            await acceptFriendRequest(id);
            friendsData.removeRequest(id);
            convs.refresh();
            return { status: "friends" };
          },
          "Could not accept the request.",
        ),
      decline: (p, requestId) =>
        void run(
          p.id,
          async () => {
            const id = requestId ?? friendshipOf(p).requestId;
            if (id) {
              await declineFriendRequest(id);
              friendsData.removeRequest(id);
            }
            return { status: "none" };
          },
          "Could not decline the request.",
        ),
      unfriend: (p) =>
        void run(
          p.id,
          async () => {
            await unfriendApi(p.id);
            friendsData.removeFriend(p.id);
            return { status: "none" };
          },
          "Could not remove this friend.",
        ),
    }),
    [friendshipOf, busy, openDm, run, friendsData, convs],
  );

  const selectConversation = useCallback(
    (c: ChatConversation) => {
      setProfileId(null);
      setActiveId(c.id);
    },
    [setActiveId],
  );

  const handleActivity = useCallback(
    (conv: ChatConversation, preview: string, createdAt: string) => {
      const known = convs.items.some((c) => c.id === conv.id);
      if (known) {
        convs.patch(conv.id, (c) => ({
          ...c,
          lastMessage: { preview, createdAt, senderName: "You", mine: true },
          updatedAt: createdAt,
        }));
      } else {
        convs.refresh();
      }
    },
    [convs],
  );

  const viewing = useRef(new Set<string>());
  const handleViewed = useCallback(
    (conv: ChatConversation) => {
      convs.markReadLocally(conv.id);
      onConversationViewed?.(conv);
      if (viewing.current.has(conv.id)) return;
      viewing.current.add(conv.id);
      const call =
        conv.type === "dm"
          ? markDmRead(conv.person?.id ?? conv.id.replace(/^dm:/, ""))
          : markGroupRead(conv.teamId ?? conv.id.replace(/^team:/, ""));
      void call
        .catch(() => undefined)
        .finally(() => {
          viewing.current.delete(conv.id);
        });
    },
    [convs, onConversationViewed],
  );

  const requestCount = friendsData.requests.incoming.length;
  const unreadTotal = convs.items.reduce((n, c) => n + c.unread, 0);

  const showList = twoPane || !activeConv;
  const showThread = twoPane || !!activeConv;

  const sizing =
    inDialog
      ? "h-full"
      : variant === "card"
        ? "h-[560px] max-h-[calc(100dvh-6rem)] min-h-[420px]"
        : "h-[calc(100dvh-11.5rem)] min-h-[420px] sm:h-[calc(100dvh-8.5rem)]";
  const frame = inDialog || variant === "card" ? "" : "rounded-2xl border border-brand-softline shadow-xs";

  const tabs: Array<{ id: Tab; label: string; badge: number }> = [
    { id: "chats", label: "Chats", badge: unreadTotal },
    { id: "friends", label: "Friends", badge: requestCount },
    { id: "people", label: "Find people", badge: 0 },
  ];

  const onTabKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <ChatPeopleProvider value={actions}>
      <div
        ref={rootRef}
        className={`relative flex min-w-0 overflow-hidden bg-white ${sizing} ${frame} ${className ?? ""}`}
        style={fitHeight ? { height: fitHeight } : undefined}
      >
        {showList ? (
          <div
            className={`flex min-h-0 flex-col bg-[#FAF7F2] ${twoPane ? "w-[320px] shrink-0 border-r border-brand-softline" : "w-full"}`}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-deep">
                <ChatIcon className="h-5 w-5 text-brand-primary" />
                Messages
              </h2>
              {variant === "card" && !inDialog && onExpand ? (
                <button
                  type="button"
                  onClick={onExpand}
                  aria-label="Expand chat"
                  title="Expand"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-white hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
                >
                  <ExpandIcon className="h-5 w-5" />
                </button>
              ) : null}
            </div>
            <div role="tablist" aria-label="Chat sections" className="flex shrink-0 gap-1 px-3 pb-2">
              {tabs.map((t, i) => (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`chat-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="chat-tabpanel"
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
                    tab === t.id ? "bg-brand-primary text-white shadow-sm" : "text-brand-muted hover:bg-white hover:text-brand-deep"
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  {t.badge > 0 ? (
                    <span
                      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        tab === t.id ? "bg-white text-brand-primary" : "bg-brand-primary text-white"
                      }`}
                    >
                      <span aria-hidden="true">{t.badge > 99 ? "99+" : t.badge}</span>
                      <span className="sr-only">{t.id === "friends" ? `${t.badge} friend requests` : `${t.badge} unread`}</span>
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div id="chat-tabpanel" role="tabpanel" aria-labelledby={`chat-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
              {tab === "chats" ? (
                <ConversationList
                  items={convs.items}
                  loading={convs.loading}
                  error={convs.error}
                  activeId={activeId}
                  onSelect={selectConversation}
                  onRetry={convs.refresh}
                  onFindPeople={() => setTab("people")}
                />
              ) : tab === "friends" ? (
                <FriendsPanel
                  friends={friendsData.friends}
                  requests={friendsData.requests}
                  loading={friendsData.loading}
                  error={friendsData.error}
                  onRetry={friendsData.refresh}
                  onFindPeople={() => setTab("people")}
                />
              ) : (
                <PeoplePanel />
              )}
            </div>
          </div>
        ) : null}

        {showThread ? (
          <div
            ref={threadWrapRef}
            tabIndex={-1}
            className="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
          >
            {activeConv ? (
              <ThreadView
                key={activeConv.id}
                conv={activeConv}
                me={me}
                meName={meName}
                onBack={twoPane ? undefined : () => {
                  setActiveId(null);
                  requestAnimationFrame(() => tabRefs.current[tab]?.focus());
                }}
                onOpenProfile={(id) => setProfileId(id)}
                onActivity={handleActivity}
                onViewed={handleViewed}
              />
            ) : (
              <div
                className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center"
                style={{
                  backgroundColor: "#F4EEE6",
                  backgroundImage: "radial-gradient(rgba(217,107,39,0.09) 1px, transparent 1.2px)",
                  backgroundSize: "22px 22px",
                }}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-primary shadow-xs">
                  <ChatIcon className="h-8 w-8" />
                </span>
                <p className="text-base font-extrabold text-brand-deep">Prabodh Messages</p>
                <p className="max-w-xs text-sm text-brand-muted">
                  Select a chat to read it, or find people to add as friends and start a conversation.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {profileId ? <PersonProfileSheet key={profileId} userId={profileId} wide={twoPane} onClose={() => setProfileId(null)} /> : null}

        {notice ? (
          <div
            role="alert"
            className="absolute inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xl"
          >
            <span className="min-w-0 flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </ChatPeopleProvider>
  );
}

/**
 * WhatsApp-style chat for the whole portal: conversation list, friends, people search and threads in
 * one component. `card` is a fixed-height dashboard card with an Expand button; `page` fills the page.
 */
export default function ChatWorkspace(props: ChatWorkspaceProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(props.initialConversationId ?? null);

  if (props.variant === "card" && expanded) {
    return (
      <>
        <div
          className={`flex h-[560px] max-h-[calc(100dvh-6rem)] min-h-[420px] flex-col items-center justify-center gap-3 bg-[#FAF7F2] px-6 text-center ${props.className ?? ""}`}
        >
          <p className="text-sm font-semibold text-brand-deep">Chat is open in the expanded view.</p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
          >
            Bring it back here
          </button>
        </div>
        <ExpandDialog title="Messages" onClose={() => setExpanded(false)}>
          <ChatWorkspaceCore variant="page" inDialog initialConversationId={activeId ?? undefined} onActiveChange={setActiveId} />
        </ExpandDialog>
      </>
    );
  }

  return (
    <ChatWorkspaceCore
      {...props}
      initialConversationId={props.variant === "card" ? (activeId ?? props.initialConversationId) : props.initialConversationId}
      onExpand={props.variant === "card" ? () => setExpanded(true) : undefined}
      onActiveChange={props.variant === "card" ? setActiveId : undefined}
    />
  );
}
