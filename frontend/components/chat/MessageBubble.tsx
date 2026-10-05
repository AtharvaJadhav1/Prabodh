"use client";

import { memo, useRef } from "react";
import { formatClock, linkify, roleChipLabel } from "../../lib/chat-format";
import { getUserAvatarUrl } from "../../lib/avatar";
import type { ChatMessage } from "../../lib/chat-types";
import ChatAvatar from "./ChatAvatar";
import { AlertIcon, ChevronDownIcon, ClockIcon, DoubleTickIcon, RetryIcon, TickIcon, TrashIcon } from "./chat-icons";

type Props = {
  msg: ChatMessage;
  first: boolean;
  isGroup: boolean;
  onMenu: (msg: ChatMessage, x: number, y: number) => void;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
};

function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 13"
      className={`absolute top-0 h-[13px] w-2 ${mine ? "-right-[7px] text-[#FBE3CE]" : "-left-[7px] text-white"}`}
    >
      <path fill="currentColor" d={mine ? "M0 0h8L0 13z" : "M8 0H0l8 13z"} />
    </svg>
  );
}

function Body({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((seg, i) =>
        seg.type === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all text-sky-700 underline decoration-sky-700/40 underline-offset-2 hover:decoration-sky-700"
          >
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

function MessageBubbleImpl({ msg, first, isGroup, onMenu, onRetry, onDiscard }: Props) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine = msg.mine;
  const chip = !mine && isGroup ? roleChipLabel(msg.senderRole) : null;
  const canMenu = msg.status !== "sending" && msg.status !== "failed";
  const showTick = !isGroup && mine;

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const tick =
    msg.status === "sending" ? (
      <ClockIcon className="h-3 w-3 text-brand-muted" />
    ) : msg.status === "failed" ? (
      <AlertIcon className="h-3.5 w-3.5 text-red-600" />
    ) : showTick && msg.status === "read" ? (
      <DoubleTickIcon className="h-[11px] w-[17px] text-sky-500" />
    ) : showTick ? (
      <TickIcon className="h-[11px] w-[14px] text-brand-muted" />
    ) : null;

  const tickLabel =
    msg.status === "sending" ? "Sending" : msg.status === "failed" ? "Not sent" : msg.status === "read" ? "Read" : "Sent";

  return (
    <div
      role="listitem"
      className={`group/msg flex w-full items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}
    >
      {!mine && isGroup ? (
        <div className="w-7 shrink-0 self-start">
          {first ? (
            <ChatAvatar
              name={msg.senderName}
              size={28}
              src={getUserAvatarUrl({ id: msg.senderId, email: msg.senderEmail, fullName: msg.senderName, avatarUrl: msg.senderAvatarUrl })}
            />
          ) : null}
        </div>
      ) : null}
      <div className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`relative min-w-[64px] max-w-full rounded-2xl px-3 pb-1.5 pt-1.5 text-[15px] leading-[21px] text-brand-charcoal shadow-[0_1px_0.5px_rgba(43,37,35,0.13)] [-webkit-touch-callout:none] md:text-sm md:leading-5 ${
            mine ? "bg-[#FBE3CE]" : "bg-white"
          } ${first ? (mine ? "rounded-tr-none" : "rounded-tl-none") : ""} ${msg.status === "failed" ? "ring-1 ring-red-300" : ""}`}
          onContextMenu={(e) => {
            if (!canMenu) return;
            e.preventDefault();
            onMenu(msg, e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (!canMenu) return;
            const t = e.touches[0];
            const x = t.clientX;
            const y = t.clientY;
            clearPress();
            pressTimer.current = setTimeout(() => {
              pressTimer.current = null;
              onMenu(msg, x, y);
            }, 450);
          }}
          onTouchMove={clearPress}
          onTouchEnd={clearPress}
          onTouchCancel={clearPress}
        >
          {first ? <Tail mine={mine} /> : null}
          {canMenu ? (
            <button
              type="button"
              aria-label="Message options"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onMenu(msg, r.right, r.bottom);
              }}
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-white/70 text-brand-muted opacity-0 transition-opacity hover:text-brand-deep focus-visible:opacity-100 group-hover/msg:opacity-100 [@media(pointer:fine)]:flex"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          ) : null}
          {first && !mine && isGroup ? (
            <div className="mb-0.5 flex items-center gap-1.5 pr-5">
              <span className="truncate text-xs font-bold text-brand-deep">{msg.senderName}</span>
              {chip ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                    msg.senderRole === "institute_mentor" ? "bg-emerald-600 text-white" : "bg-brand-primary/15 text-brand-primary"
                  }`}
                >
                  {chip}
                </span>
              ) : null}
            </div>
          ) : null}
          {msg.deleted ? (
            <p className="italic text-brand-muted">This message was deleted</p>
          ) : (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              <Body text={msg.body} />
            </p>
          )}
          <span className="float-right -mb-0.5 ml-2 mt-1 flex items-center gap-1 text-[10.5px] leading-none text-brand-muted">
            {formatClock(msg.createdAt)}
            {tick ? (
              <>
                {tick}
                <span className="sr-only">{tickLabel}</span>
              </>
            ) : null}
          </span>
          <span className="clear-both block" />
        </div>
        {msg.status === "failed" ? (
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-red-700" role="alert">
            <span>Not sent</span>
            <button
              type="button"
              onClick={() => onRetry(msg.key)}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-brand-primary hover:bg-brand-lightOrange"
            >
              <RetryIcon className="h-3.5 w-3.5" /> Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(msg.key)}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleImpl);
export default MessageBubble;
