"use client";

import { memo, useMemo } from "react";
import { formatListTime } from "../../../lib/chat-format";
import type { ChatConversation } from "../../../lib/chat-types";
import ChatAvatar from "../ChatAvatar";
import { AlertIcon, SupportIcon, TickIcon, UserPlusIcon } from "../chat-icons";
import { EmptyChatsArt, NoResultsArt } from "./AppIllustrations";

type Props = {
  items: ChatConversation[];
  loading: boolean;
  error: string | null;
  /** Filter text owned by the header search field. */
  filter: string;
  onSelect: (c: ChatConversation) => void;
  onRetry: () => void;
  onFindPeople: () => void;
};

function previewParts(c: ChatConversation): { mine: boolean; prefix: string; text: string } {
  const lm = c.lastMessage;
  if (!lm) return { mine: false, prefix: "", text: c.subtitle ?? "No messages yet" };
  if (lm.mine) return { mine: true, prefix: "You: ", text: lm.preview };
  if (c.type === "group" && lm.senderName) return { mine: false, prefix: `${lm.senderName}: `, text: lm.preview };
  return { mine: false, prefix: "", text: lm.preview };
}

const Row = memo(function Row({ c, onSelect }: { c: ChatConversation; onSelect: (c: ChatConversation) => void }) {
  const time = c.lastMessage ? formatListTime(c.lastMessage.createdAt) : "";
  const unread = c.unread > 0;
  const p = previewParts(c);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(c)}
        aria-label={`${c.title}${unread ? `, ${c.unread} unread` : ""}`}
        className="relative flex min-h-[76px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 after:absolute after:bottom-0 after:left-[84px] after:right-0 after:h-px after:bg-chat-line active:bg-chat-press focus-visible:bg-chat-press focus-visible:outline-none motion-reduce:transition-none"
      >
        <ChatAvatar app name={c.title} src={c.avatarUrl ?? c.person?.avatarUrl} group={c.type === "group"} size={56} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              {c.kind === "support" ? <SupportIcon className="h-3.5 w-3.5 shrink-0 text-chat-brandStrong" /> : null}
              <span className={`truncate text-[16px] leading-6 text-chat-text ${unread ? "font-bold" : "font-semibold"}`}>{c.title}</span>
            </span>
            {time ? (
              <time
                dateTime={c.lastMessage?.createdAt}
                className={`shrink-0 text-[12px] ${unread ? "font-bold text-chat-brandText" : "font-medium text-chat-muted"}`}
              >
                {time}
              </time>
            ) : null}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={`flex min-w-0 items-center gap-1 text-[14px] leading-5 ${unread ? "font-medium text-chat-text" : "text-chat-muted"}`}>
              {p.mine ? <TickIcon className="h-[11px] w-[14px] shrink-0 text-chat-tick" /> : null}
              <span className="truncate">
                {p.prefix}
                {p.text}
              </span>
            </span>
            {unread ? (
              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-chat-brandStrong px-1.5 text-[12px] font-bold leading-none text-white">
                {c.unread > 99 ? "99+" : c.unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
});

function Skeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-busy="true" aria-label="Loading chats" role="status">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
          <div className="chat-shimmer h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="chat-shimmer h-4 rounded" style={{ width: `${38 + ((i * 13) % 24)}%` }} />
            <div className="chat-shimmer h-3.5 rounded" style={{ width: `${62 + ((i * 17) % 30)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppConversationList({ items, loading, error, filter, onSelect, onRetry, onFindPeople }: Props) {
  const f = filter.trim().toLowerCase();
  const shown = useMemo(
    () =>
      f
        ? items.filter((c) => c.title.toLowerCase().includes(f) || (c.lastMessage?.preview ?? "").toLowerCase().includes(f))
        : items,
    [items, f],
  );

  if (loading && items.length === 0) return <Skeleton />;

  if (error && items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center" role="alert">
        <AlertIcon className="h-9 w-9 text-chat-danger" />
        <p className="text-[15px] font-semibold text-chat-text">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] rounded-full bg-chat-brandStrong px-6 text-[15px] font-bold text-white transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
        <EmptyChatsArt className="h-32 w-44" />
        <h2 className="mt-4 text-[18px] font-extrabold text-chat-text">No chats yet</h2>
        <p className="mt-1.5 max-w-[17rem] text-[14px] leading-5 text-chat-muted">
          Find classmates and mentors to start a conversation. Your team and mentor chats will show up here too.
        </p>
        <button
          type="button"
          onClick={onFindPeople}
          className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-chat-brandStrong px-6 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(194,87,26,0.35)] transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand"
        >
          <UserPlusIcon className="h-5 w-5" />
          Find people
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <div role="status" className="flex shrink-0 items-center gap-2 bg-chat-brandSoft px-4 py-1.5 text-[13px] font-semibold text-chat-brandText">
          <AlertIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Having trouble refreshing.</span>
          <button type="button" onClick={onRetry} className="min-h-[36px] rounded-md px-2 underline-offset-2 active:underline">
            Retry
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center px-8 pt-12 text-center">
            <NoResultsArt className="h-28 w-40" />
            <p className="mt-3 text-[15px] font-semibold text-chat-text">No chats match &ldquo;{filter.trim()}&rdquo;</p>
            <p className="mt-1 text-[13px] text-chat-muted">Try a different name, or find new people to chat with.</p>
          </div>
        ) : (
          <ul aria-label="Chats">
            {shown.map((c) => (
              <Row key={c.id} c={c} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
