"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import type { ChatConversation } from "../../../lib/chat-types";

type Props = {
  /** The open conversation, or null to show only the list. */
  conv: ChatConversation | null;
  /** Ref for the thread layer (focus target when a conversation opens). */
  threadRef: Ref<HTMLDivElement>;
  list: ReactNode;
  renderThread: (conv: ChatConversation) => ReactNode;
};

const SLIDE_MS = 260;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Two stacked full-screen layers. Opening a conversation slides the thread in from the right while the list
 * parallax-shifts left; closing reverses it. The thread stays mounted until the slide-out has finished and the
 * list is hidden from assistive tech and focus while the thread fully covers it. Transform-only, and instant
 * under prefers-reduced-motion.
 */
export default function AppPanes({ conv, threadRef, list, renderThread }: Props) {
  const id = conv?.id ?? null;
  const last = useRef<ChatConversation | null>(conv);
  if (conv) last.current = conv;

  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [covered, setCovered] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (id) {
      wasOpen.current = true;
      setLeaving(false);
      // Two frames: the off-screen position must be painted before the transition target is applied.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setOpen(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    setOpen(false);
    setCovered(false);
    setLeaving(true);
    const t = setTimeout(() => setLeaving(false), reducedMotion() ? 0 : SLIDE_MS);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setCovered(true), reducedMotion() ? 0 : SLIDE_MS);
    return () => clearTimeout(t);
  }, [open]);

  const shown = conv ?? (leaving ? last.current : null);

  return (
    <>
      <div
        className={`absolute inset-0 flex flex-col transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "-translate-x-[22%]" : "translate-x-0"
        } ${covered ? "invisible" : ""}`}
        aria-hidden={covered || undefined}
      >
        {list}
      </div>
      {shown ? (
        <div
          ref={threadRef}
          tabIndex={-1}
          className={`absolute inset-0 z-20 flex flex-col bg-chat-bg outline-none transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "translate-x-0 shadow-[-8px_0_24px_rgba(0,0,0,0.12)]" : "translate-x-full"
          }`}
        >
          {renderThread(shown)}
        </div>
      ) : null}
    </>
  );
}
