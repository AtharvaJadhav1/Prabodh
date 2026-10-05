"use client";

import { memo, useMemo, useState } from "react";
import { formatListTime } from "../../lib/chat-format";
import type { ChatConversation } from "../../lib/chat-types";
import ChatAvatar from "./ChatAvatar";
import { AlertIcon, GroupIcon, SearchIcon } from "./chat-icons";

type Props = {
  items: ChatConversation[];
  loading: boolean;
  error: string | null;
  activeId: string | null;
  onSelect: (c: ChatConversation) => void;
  onRetry: () => void;
  onFindPeople: () => void;
};

function previewText(c: ChatConversation): string {
  const lm = c.lastMessage;
  if (!lm) return c.subtitle ?? "No messages yet";
  if (lm.mine) return `You: ${lm.preview}`;
  if (c.type === "group" && lm.senderName) return `${lm.senderName}: ${lm.preview}`;
  return lm.preview;
}

const Row = memo(function Row({ c, active, onSelect }: { c: ChatConversation; active: boolean; onSelect: (c: ChatConversation) => void }) {
  const time = c.lastMessage ? formatListTime(c.lastMessage.createdAt) : "";
  const unread = c.unread > 0;
  return (
    <li role="listitem">
      <button
        type="button"
        onClick={() => onSelect(c)}
        aria-current={active ? "true" : undefined}
        aria-label={`${c.title}${unread ? `, ${c.unread} unread` : ""}`}
        className={`flex min-h-[68px] w-full items-center gap-3 border-b border-brand-softline/50 px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary ${
          active ? "bg-brand-lightOrange" : "hover:bg-brand-lightOrange/50"
        }`}
      >
        <ChatAvatar name={c.title} src={c.avatarUrl ?? c.person?.avatarUrl} group={c.type === "group"} size={48} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {c.type === "group" ? <GroupIcon className="h-3.5 w-3.5 shrink-0 text-brand-muted" /> : null}
              <span className={`truncate text-[15px] text-brand-deep ${unread ? "font-extrabold" : "font-bold"}`}>{c.title}</span>
            </span>
            {time ? (
              <time
                dateTime={c.lastMessage?.createdAt}
                className={`shrink-0 text-[11px] ${unread ? "font-bold text-brand-primary" : "font-medium text-brand-muted"}`}
              >
                {time}
              </time>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-[13px] ${unread ? "font-semibold text-brand-charcoal" : "text-brand-muted"}`}>{previewText(c)}</span>
            {unread ? (
              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[11px] font-bold text-white">
                {c.unread > 99 ? "99+" : c.unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
});

export default function ConversationList({ items, loading, error, activeId, onSelect, onRetry, onFindPeople }: Props) {
  const [filter, setFilter] = useState("");
  const f = filter.trim().toLowerCase();
  const shown = useMemo(
    () =>
      f
        ? items.filter((c) => c.title.toLowerCase().includes(f) || (c.lastMessage?.preview ?? "").toLowerCase().includes(f))
        : items,
    [items, f],
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex-1 space-y-1 p-3" aria-busy="true" aria-label="Loading chats">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2" aria-hidden="true">
            <div className="h-12 w-12 shrink-0 rounded-full bg-brand-sand motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 rounded bg-brand-sand motion-safe:animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-brand-sand/70 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center" role="alert">
        <AlertIcon className="h-8 w-8 text-red-600" />
        <p className="text-sm font-semibold text-brand-deep">{error}</p>
        <button type="button" onClick={onRetry} className="min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover">
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lightOrange text-brand-primary">
          <GroupIcon className="h-7 w-7" />
        </span>
        <p className="mt-3 text-sm font-bold text-brand-deep">No chats yet</p>
        <p className="mt-1 max-w-[16rem] text-xs text-brand-muted">Find people to start a conversation. Your team and mentor chats show up here too.</p>
        <button type="button" onClick={onFindPeople} className="mt-4 min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover">
          Find people
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <div role="status" className="flex shrink-0 items-center gap-2 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          <AlertIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Having trouble refreshing.</span>
          <button type="button" onClick={onRetry} className="rounded-md px-2 py-1 text-brand-primary hover:bg-white">
            Retry
          </button>
        </div>
      ) : null}
      <div className="shrink-0 px-3 pb-2 pt-1">
        <label htmlFor="chat-filter" className="sr-only">
          Search your chats
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            id="chat-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats"
            autoComplete="off"
            className="h-10 w-full rounded-full border border-brand-softline bg-white pl-10 pr-4 text-[16px] text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted/70 focus:border-brand-primary md:text-sm"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {shown.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-brand-muted">No chats match &ldquo;{filter.trim()}&rdquo;.</p>
        ) : (
          <ul role="list" aria-label="Chats">
            {shown.map((c) => (
              <Row key={c.id} c={c} active={c.id === activeId} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
