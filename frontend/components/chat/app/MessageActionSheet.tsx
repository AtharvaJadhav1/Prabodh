"use client";

import { useRef } from "react";
import type { ChatMessage } from "../../../lib/chat-types";
import { CopyIcon, TrashIcon } from "../chat-icons";
import { useModalFocus } from "../useProfileSheet";

type Props = {
  msg: ChatMessage;
  onClose: () => void;
  onCopy: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
};

const ACTION =
  "flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 text-left text-[16px] font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] active:bg-chat-press focus-visible:bg-chat-press focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";

/** Bottom action sheet for a long-pressed message (mobile app layout). */
export default function MessageActionSheet({ msg, onClose, onCopy, onDelete }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const canDelete = msg.mine && !!msg.id && !msg.deleted;
  const canCopy = !msg.deleted && msg.body.length > 0;
  useModalFocus(panelRef, firstRef, onClose);

  if (!canCopy && !canDelete) return null;

  return (
    <div className="absolute inset-0 z-[80] flex" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close message actions"
        onClick={onClose}
        className="absolute inset-0 animate-[chat-fade-in_180ms_ease-out] bg-chat-overlay motion-reduce:animate-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Message actions"
        className="relative mt-auto w-full animate-[chat-sheet-up_240ms_cubic-bezier(0.22,1,0.36,1)] rounded-t-3xl bg-chat-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] motion-reduce:animate-none"
      >
        <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-chat-tick opacity-50" aria-hidden="true" />
        {!msg.deleted && msg.body ? (
          <p className="mx-1 mb-2 line-clamp-2 rounded-xl bg-chat-field px-3 py-2 text-[14px] leading-5 text-chat-muted [overflow-wrap:anywhere]">{msg.body}</p>
        ) : null}
        {canCopy ? (
          <button ref={firstRef} type="button" onClick={() => onCopy(msg)} className={`${ACTION} text-chat-text`}>
            <CopyIcon className="h-5 w-5 text-chat-muted" /> Copy
          </button>
        ) : null}
        {canDelete ? (
          <button ref={canCopy ? undefined : firstRef} type="button" onClick={() => onDelete(msg)} className={`${ACTION} text-chat-danger`}>
            <TrashIcon className="h-5 w-5" /> Delete
          </button>
        ) : null}
        <button type="button" onClick={onClose} className={`${ACTION} mt-1 justify-center bg-chat-field text-chat-text`}>
          Cancel
        </button>
      </div>
    </div>
  );
}
