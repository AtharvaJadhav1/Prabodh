"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SendIcon } from "./chat-icons";

export const MAX_MESSAGE_LENGTH = 2000;
const COUNTER_FROM = 1800;
const MAX_LINES = 6;

const memoryDrafts = new Map<string, string>();

function readDraft(convId: string): string {
  const mem = memoryDrafts.get(convId);
  if (mem !== undefined) return mem;
  try {
    return window.sessionStorage.getItem(`chat-draft:${convId}`) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(convId: string, value: string) {
  if (value) memoryDrafts.set(convId, value);
  else memoryDrafts.delete(convId);
  try {
    if (value) window.sessionStorage.setItem(`chat-draft:${convId}`, value);
    else window.sessionStorage.removeItem(`chat-draft:${convId}`);
  } catch {
    /* storage unavailable: the in-memory draft still works */
  }
}

type Props = {
  convId: string;
  placeholder: string;
  onSend: (text: string) => void;
  /** Called when the user focuses/types so the thread can stay pinned to the latest message. */
  onFocusInput?: () => void;
  /** Full-screen mobile style: borderless bar, borderless pill input. */
  app?: boolean;
};

export default function Composer({ convId, placeholder, onSend, onFocusInput, app = false }: Props) {
  const [text, setText] = useState("");
  const [finePointer, setFinePointer] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Draft restore happens after mount so server and client markup match.
    setText(readDraft(convId));
  }, [convId]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const apply = () => setFinePointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lh = parseFloat(window.getComputedStyle(el).lineHeight) || 22;
    const pad = el.offsetHeight - el.clientHeight;
    const max = lh * MAX_LINES + pad + 16;
    el.style.height = `${Math.min(el.scrollHeight + pad, max)}px`;
    el.style.overflowY = el.scrollHeight + pad > max ? "auto" : "hidden";
  }, [text]);

  const submit = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText("");
    writeDraft(convId, "");
    ref.current?.focus();
  }, [text, onSend, convId]);

  const canSend = text.trim().length > 0;

  return (
    <form
      className={`flex shrink-0 items-end gap-2 px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3 ${app ? "bg-[#F4EEE6]" : "border-t border-brand-softline bg-[#FAF7F2]"}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`chat-input-${convId}`} className="sr-only">
          Message
        </label>
        <textarea
          id={`chat-input-${convId}`}
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={placeholder}
          enterKeyHint={finePointer ? "send" : "enter"}
          onFocus={onFocusInput}
          onChange={(e) => {
            setText(e.target.value);
            writeDraft(convId, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            // Desktop: Enter sends. Touch devices keep Enter as a newline; use the send button.
            if (finePointer) {
              e.preventDefault();
              submit();
            }
          }}
          className={`block w-full resize-none rounded-3xl bg-white px-4 py-2.5 text-[16px] leading-[22px] text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted/70 md:text-sm md:leading-[22px] ${app ? "border-0" : "border border-brand-softline focus:border-brand-primary"}`}
        />
        {text.length >= COUNTER_FROM ? (
          <span
            className={`pointer-events-none absolute -top-5 right-2 text-[11px] font-semibold ${
              text.length >= MAX_MESSAGE_LENGTH ? "text-red-600" : "text-brand-muted"
            }`}
            aria-live="polite"
          >
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        onMouseDown={(e) => e.preventDefault()}
        className="mb-px flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:bg-brand-primary/40"
      >
        <SendIcon className="h-5 w-5 translate-x-px" />
      </button>
    </form>
  );
}
