"use client";

import { memo, useEffect, useRef, useState } from "react";
import { formatClock, roleChipLabel } from "../../../lib/chat-format";
import { getUserAvatarUrl } from "../../../lib/avatar";
import type { ChatMessage } from "../../../lib/chat-types";
import ChatAvatar from "../ChatAvatar";
import MessageText from "../MessageText";
import { AlertIcon, ChevronDownIcon, ClockIcon, DoubleTickIcon, RetryIcon, TickIcon, TrashIcon } from "../chat-icons";

type Props = {
  msg: ChatMessage;
  /** First bubble of a run from the same sender: gets the tail and (in groups) the sender name. */
  first: boolean;
  /** Last bubble of the run. */
  last: boolean;
  isGroup: boolean;
  onMenu: (msg: ChatMessage, x: number, y: number) => void;
  onRetry: (key: string) => void;
  onDiscard: (key: string) => void;
};

const LONG_PRESS_MS = 450;
const SENDER_COLORS = 8;
const LINK_CLASS = "break-all text-chat-link underline underline-offset-2";

/** Stable per-sender colour (CSS variable from the chat theme). */
function senderColor(senderId: string): string {
  let h = 0;
  for (let i = 0; i < senderId.length; i++) h = (h * 31 + senderId.charCodeAt(i)) >>> 0;
  return `var(--chat-sender-${(h % SENDER_COLORS) + 1})`;
}

function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 13"
      className={`absolute top-0 h-[13px] w-2 ${mine ? "-right-[7px] text-chat-out" : "-left-[7px] text-chat-in"}`}
    >
      <path fill="currentColor" d={mine ? "M0 0h8L0 13z" : "M8 0H0l8 13z"} />
    </svg>
  );
}

function MessageBubbleImpl({ msg, first, last, isGroup, onMenu, onRetry, onDiscard }: Props) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = useState(false);
  const mine = msg.mine;
  const chip = !mine && isGroup ? roleChipLabel(msg.senderRole) : null;
  const canMenu = msg.status !== "sending" && msg.status !== "failed";
  const showTick = !isGroup && mine;

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressed(false);
  };

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    },
    [],
  );

  const tick =
    msg.status === "sending" ? (
      <ClockIcon className="h-3 w-3 text-chat-tick" />
    ) : msg.status === "failed" ? (
      <AlertIcon className="h-3.5 w-3.5 text-chat-danger" />
    ) : showTick && msg.status === "read" ? (
      <DoubleTickIcon className="h-[11px] w-[17px] text-chat-tickRead" />
    ) : showTick ? (
      <TickIcon className="h-[11px] w-[14px] text-chat-tick" />
    ) : null;

  const tickLabel =
    msg.status === "sending" ? "Sending" : msg.status === "failed" ? "Not sent" : msg.status === "read" ? "Read" : "Sent";

  // Tight corners where bubbles of one run touch; the first bubble's tip is squared off by the tail.
  const radius = [
    first ? (mine ? "rounded-tr-none" : "rounded-tl-none") : mine ? "rounded-tr-[6px]" : "rounded-tl-[6px]",
    last ? "" : mine ? "rounded-br-[6px]" : "rounded-bl-[6px]",
  ].join(" ");

  return (
    <div
      role="listitem"
      className={`group/msg flex w-full items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}
    >
      {!mine && isGroup ? (
        <div className="w-7 shrink-0 self-start">
          {first ? (
            <ChatAvatar
              app
              name={msg.senderName}
              size={28}
              src={getUserAvatarUrl({ id: msg.senderId, email: msg.senderEmail, fullName: msg.senderName, avatarUrl: msg.senderAvatarUrl })}
            />
          ) : null}
        </div>
      ) : null}
      <div className={`flex min-w-0 max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`relative min-w-[64px] max-w-full rounded-2xl px-3 pb-1.5 pt-1.5 text-[15px] leading-[21px] text-chat-text shadow-[0_1px_1px_rgba(0,0,0,0.14)] transition-transform duration-150 [-webkit-touch-callout:none] motion-reduce:transition-none ${
            mine ? "bg-chat-out" : "bg-chat-in"
          } ${radius} ${msg.status === "failed" ? "ring-1 ring-chat-danger" : ""} ${pressed ? "scale-[0.98]" : ""}`}
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
            setPressed(true);
            pressTimer.current = setTimeout(() => {
              pressTimer.current = null;
              setPressed(false);
              navigator.vibrate?.(8);
              onMenu(msg, x, y);
            }, LONG_PRESS_MS);
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
              className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-chat-pill text-chat-muted opacity-0 transition-opacity hover:text-chat-text focus-visible:opacity-100 group-hover/msg:opacity-100 [@media(pointer:fine)]:flex"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          ) : null}
          {first && !mine && isGroup ? (
            <div className="mb-0.5 flex items-center gap-1.5 pr-5">
              <span className="truncate text-[13px] font-bold" style={{ color: senderColor(msg.senderId) }}>
                {msg.senderName}
              </span>
              {chip ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                    msg.senderRole === "institute_mentor" ? "bg-brand-approved text-white" : "bg-chat-brandSoft text-chat-brandText"
                  }`}
                >
                  {chip}
                </span>
              ) : null}
            </div>
          ) : null}
          {msg.deleted ? (
            <p className="italic text-chat-meta">This message was deleted</p>
          ) : (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              <MessageText text={msg.body} linkClassName={LINK_CLASS} />
            </p>
          )}
          <span className="float-right -mb-0.5 ml-2 mt-1 flex items-center gap-1 text-[11px] leading-none text-chat-meta">
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
          <div className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-chat-danger" role="alert">
            <span className="mr-1 rounded-full bg-chat-pill px-2 py-0.5">Not sent</span>
            <button
              type="button"
              onClick={() => onRetry(msg.key)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 text-chat-brandText active:bg-chat-press"
            >
              <RetryIcon className="h-4 w-4" /> Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(msg.key)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 text-chat-danger active:bg-chat-press"
            >
              <TrashIcon className="h-4 w-4" /> Remove
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const AppMessageBubble = memo(MessageBubbleImpl);
export default AppMessageBubble;
