"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildTimeline } from "../../lib/chat-format";
import type { ChatConversation, ChatMessage } from "../../lib/chat-types";
import ChatAvatar from "./ChatAvatar";
import Composer from "./Composer";
import MessageBubble from "./MessageBubble";
import { AlertIcon, ArrowDownIcon, BackIcon, CloseIcon, CopyIcon, RetryIcon, TrashIcon } from "./chat-icons";
import { useThread } from "./useThread";

type Props = {
  conv: ChatConversation;
  me: string;
  meName: string;
  /** Show a back arrow (single-pane layout). */
  onBack?: () => void;
  onOpenProfile: (userId: string) => void;
  /** Message sent: update the list preview. */
  onActivity: (conv: ChatConversation, preview: string, createdAt: string) => void;
  /** Thread is on screen with unread messages: tell the server and clear the badge. */
  onViewed: (conv: ChatConversation) => void;
};

const pattern = {
  backgroundColor: "#F4EEE6",
  backgroundImage:
    "radial-gradient(rgba(217,107,39,0.09) 1px, transparent 1.2px), radial-gradient(rgba(91,46,16,0.05) 1px, transparent 1.2px)",
  backgroundSize: "22px 22px, 22px 22px",
  backgroundPosition: "0 0, 11px 11px",
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type MenuState = { msg: ChatMessage; x: number; y: number } | null;

function MessageMenu({
  menu,
  onClose,
  onCopy,
  onDelete,
}: {
  menu: NonNullable<MenuState>;
  onClose: () => void;
  onCopy: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  const canDelete = menu.msg.mine && !!menu.msg.id && !menu.msg.deleted;
  const canCopy = !menu.msg.deleted && menu.msg.body.length > 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      left: Math.max(8, Math.min(menu.x - w + 8, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
    });
    el.querySelector<HTMLElement>("button")?.focus();
  }, [menu]);

  useEffect(() => {
    const onDown = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (!canCopy && !canDelete) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Message actions"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-brand-softline bg-white py-1 shadow-xl"
    >
      {canCopy ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => onCopy(menu.msg)}
          className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm font-semibold text-brand-charcoal hover:bg-brand-lightOrange focus-visible:bg-brand-lightOrange focus-visible:outline-none"
        >
          <CopyIcon className="h-4 w-4 text-brand-muted" /> Copy
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => onDelete(menu.msg)}
          className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
        >
          <TrashIcon className="h-4 w-4" /> Delete
        </button>
      ) : null}
    </div>
  );
}

function ThreadSkeleton() {
  const rows = [
    ["start", "w-48"],
    ["start", "w-64"],
    ["end", "w-40"],
    ["start", "w-56"],
    ["end", "w-60"],
    ["end", "w-32"],
  ] as const;
  return (
    <div className="flex flex-1 flex-col gap-2 p-4" aria-hidden="true">
      {rows.map(([side, w], i) => (
        <div
          key={i}
          className={`h-9 rounded-2xl bg-white/80 motion-safe:animate-pulse ${w} ${side === "end" ? "self-end bg-[#FBE3CE]/80" : "self-start"}`}
        />
      ))}
    </div>
  );
}

export default function ThreadView({ conv, me, meName, onBack, onOpenProfile, onActivity, onViewed }: Props) {
  const isGroup = conv.type === "group";
  const handleActivity = useCallback(
    (preview: string, createdAt: string) => onActivity(conv, preview, createdAt),
    [onActivity, conv],
  );
  const t = useThread(conv, me, meName, handleActivity);
  const { messages, loading, hasMore, loadingOlder, loadOlder } = t;

  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prev = useRef<{ first: string | null; last: string | null; height: number }>({
    first: null,
    last: null,
    height: 0,
  });
  const [showJump, setShowJump] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [menu, setMenu] = useState<MenuState>(null);
  const [visible, setVisible] = useState(true);

  const timeline = useMemo(() => buildTimeline(messages), [messages]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    const first = messages[0]?.key ?? null;
    const last = messages[messages.length - 1]?.key ?? null;
    const p = prev.current;
    if (p.last === null && last !== null) {
      el.scrollTop = el.scrollHeight;
      atBottom.current = true;
    } else {
      if (first !== p.first && p.first !== null && messages.some((m) => m.key === p.first)) {
        // Older messages were inserted above: keep the viewport anchored on what was visible.
        el.scrollTop += el.scrollHeight - p.height;
      }
      if (last !== p.last && last !== null) {
        const lastMsg = messages[messages.length - 1];
        if (atBottom.current || lastMsg.mine) {
          scrollToBottom(true);
        } else {
          const prevIdx = messages.findIndex((m) => m.key === p.last);
          const fresh = messages.slice(prevIdx + 1).filter((m) => !m.mine).length;
          if (fresh > 0) setNewCount((c) => c + fresh);
        }
      }
    }
    prev.current = { first, last, height: el.scrollHeight };
  }, [messages, loading, scrollToBottom]);

  // Keep the latest message pinned while the composer grows or the keyboard opens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = dist < 80;
    setShowJump(dist > 240);
    if (dist < 80) setNewCount(0);
    if (el.scrollTop < 80 && hasMore && !loadingOlder && !loading) {
      prev.current.height = el.scrollHeight;
      void loadOlder();
    }
  };

  useEffect(() => {
    const apply = () => setVisible(document.visibilityState === "visible");
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, []);

  const latestIncoming = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].mine && messages[i].id) return messages[i].key;
    }
    return null;
  }, [messages]);
  const marked = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (loading || !visible) return;
    if (marked.current === undefined) {
      marked.current = latestIncoming;
      if (conv.unread > 0) onViewed(conv);
      return;
    }
    if (latestIncoming !== marked.current || conv.unread > 0) {
      marked.current = latestIncoming;
      onViewed(conv);
    }
  }, [loading, visible, latestIncoming, conv, onViewed]);

  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((msg: ChatMessage, x: number, y: number) => setMenu({ msg, x, y }), []);

  const copy = (m: ChatMessage) => {
    setMenu(null);
    const text = m.body;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).catch(() => undefined);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* clipboard unavailable */
    }
    ta.remove();
  };

  const personId = conv.person?.id ?? null;
  const headerInner = (
    <>
      <ChatAvatar name={conv.title} src={conv.avatarUrl ?? conv.person?.avatarUrl} group={isGroup} size={40} />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-bold leading-tight text-brand-deep">{conv.title}</p>
        {conv.subtitle ? <p className="truncate text-xs font-medium text-brand-muted">{conv.subtitle}</p> : null}
      </div>
    </>
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col" aria-label={`Conversation with ${conv.title}`}>
      <header className="flex min-h-[60px] shrink-0 items-center gap-1.5 border-b border-brand-softline bg-[#FAF7F2] px-2 py-2 sm:px-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to chats"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-deep transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <BackIcon className="h-5 w-5" />
          </button>
        ) : null}
        {personId ? (
          <button
            type="button"
            onClick={() => onOpenProfile(personId)}
            aria-label={`View ${conv.title}'s profile`}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            {headerInner}
          </button>
        ) : (
          <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 px-1.5">{headerInner}</div>
        )}
      </header>

      {t.error && messages.length > 0 ? (
        <div role="status" className="flex shrink-0 items-center gap-2 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <AlertIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Having trouble connecting. Retrying...</span>
          <button type="button" onClick={t.refresh} className="shrink-0 rounded-md px-2 py-1 text-brand-primary hover:bg-white">
            Retry now
          </button>
        </div>
      ) : null}
      {t.actionError ? (
        <div role="alert" className="flex shrink-0 items-center gap-2 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
          <span className="min-w-0 flex-1">{t.actionError}</span>
          <button type="button" onClick={t.clearActionError} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1" style={pattern}>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Messages"
          aria-busy={loading}
          tabIndex={0}
          className="absolute inset-0 overflow-y-auto overscroll-contain px-3 py-3 [overflow-anchor:none] focus-visible:outline-none sm:px-5"
        >
          {loading ? (
            <ThreadSkeleton />
          ) : t.error && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertIcon className="h-8 w-8 text-red-600" />
              <p className="max-w-xs text-sm font-semibold text-brand-deep">{t.error}</p>
              <button
                type="button"
                onClick={t.refresh}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
              >
                <RetryIcon className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : (
            <>
              {loadingOlder ? (
                <p className="py-2 text-center text-xs font-semibold text-brand-muted" role="status">
                  Loading earlier messages...
                </p>
              ) : null}
              {messages.length === 0 ? (
                <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-white/90 px-4 py-3 text-center text-sm font-medium text-brand-muted shadow-xs">
                  {isGroup ? "No messages yet. Start the discussion." : `No messages yet. Say hello to ${conv.title}.`}
                </div>
              ) : null}
              <div role="list" className="flex flex-col">
                {timeline.map((item) =>
                  item.type === "day" ? (
                    <div key={item.key} role="presentation" className="sticky top-1 z-10 my-2 flex justify-center">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-muted shadow-xs">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <MessageBubble
                      key={item.key}
                      msg={item.msg}
                      first={item.first}
                      isGroup={isGroup}
                      onMenu={openMenu}
                      onRetry={t.retry}
                      onDiscard={t.discard}
                    />
                  ),
                )}
              </div>
            </>
          )}
        </div>
        {showJump && !loading ? (
          <button
            type="button"
            onClick={() => {
              scrollToBottom(true);
              setNewCount(0);
            }}
            aria-label={newCount > 0 ? `Scroll to latest, ${newCount} new messages` : "Scroll to latest message"}
            className="absolute bottom-3 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-brand-softline bg-white text-brand-deep shadow-lg transition-colors hover:bg-brand-lightOrange focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <ArrowDownIcon className="h-5 w-5" />
            {newCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">
                {newCount > 99 ? "99+" : newCount}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      <Composer
        convId={conv.id}
        placeholder={isGroup ? `Message ${conv.title}` : "Type a message"}
        onSend={t.send}
        onFocusInput={() => {
          if (atBottom.current) scrollToBottom(false);
        }}
      />

      {menu ? <MessageMenu menu={menu} onClose={closeMenu} onCopy={copy} onDelete={(m) => { setMenu(null); void t.remove(m.key); }} /> : null}
    </section>
  );
}
