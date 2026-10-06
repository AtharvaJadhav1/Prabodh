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
  /** Full-screen mobile style: transparent bar over the wallpaper, round input, send button that appears with text. */
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

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 22;
    const pad = el.offsetHeight - el.clientHeight;
    const max = app
      ? lh * MAX_LINES + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + pad
      : lh * MAX_LINES + pad + 16;
    el.style.height = `${Math.min(el.scrollHeight + pad, max)}px`;
    el.style.overflowY = el.scrollHeight + pad > max ? "auto" : "hidden";
  }, [app]);

  useLayoutEffect(() => {
    fit();
  }, [text, fit]);

  // The app layout animates the send button in, which narrows the input: re-wrap when its width changes.
  useEffect(() => {
    const el = ref.current;
    if (!app || !el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [app, fit]);

  const submit = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    if (app) navigator.vibrate?.(10);
    onSend(body);
    setText("");
    writeDraft(convId, "");
    ref.current?.focus();
  }, [text, onSend, convId, app]);

  const canSend = text.trim().length > 0;
  const counter =
    text.length >= COUNTER_FROM ? (
      <span
        className={`pointer-events-none absolute right-2 text-[11px] font-semibold ${app ? "-top-7" : "-top-5"} ${
          app ? `rounded-full bg-chat-pill px-2 py-0.5 ${text.length >= MAX_MESSAGE_LENGTH ? "text-chat-danger" : "text-chat-pillText"}` : text.length >= MAX_MESSAGE_LENGTH ? "text-red-600" : "text-brand-muted"
        }`}
        aria-live="polite"
      >
        {text.length}/{MAX_MESSAGE_LENGTH}
      </span>
    ) : null;

  const textarea = (
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
      className={
        app
          ? "block w-full resize-none rounded-[24px] bg-chat-surface px-4 py-[13px] text-[16px] leading-[22px] text-chat-text shadow-[0_1px_1px_rgba(0,0,0,0.16)] outline-none placeholder:text-chat-muted focus-visible:ring-2 focus-visible:ring-chat-brand"
          : "block w-full resize-none rounded-3xl border border-brand-softline bg-white px-4 py-2.5 text-[16px] leading-[22px] text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted/70 focus:border-brand-primary md:text-sm md:leading-[22px]"
      }
    />
  );

  if (app) {
    return (
      <form
        className="flex shrink-0 items-end pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`chat-input-${convId}`} className="sr-only">
            Message
          </label>
          {textarea}
          {counter}
        </div>
        <div className={`shrink-0 overflow-hidden transition-[width,margin] duration-200 motion-reduce:transition-none ${canSend ? "ml-2 w-12" : "ml-0 w-0"}`}>
          <button
            type="submit"
            disabled={!canSend}
            tabIndex={canSend ? 0 : -1}
            aria-hidden={canSend ? undefined : true}
            aria-label="Send message"
            onMouseDown={(e) => e.preventDefault()}
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-chat-brandStrong text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-[transform,opacity] duration-200 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand motion-reduce:transition-none motion-reduce:active:scale-100 ${
              canSend ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <SendIcon className="h-5 w-5 translate-x-px" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="flex shrink-0 items-end gap-2 border-t border-brand-softline bg-[#FAF7F2] px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={`chat-input-${convId}`} className="sr-only">
          Message
        </label>
        {textarea}
        {counter}
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
