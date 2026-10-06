"use client";

import { useCallback, useEffect, useRef } from "react";

type Kind = "thread" | "profile";

type Handlers = {
  /** Browser Back closed the open conversation. */
  onPopThread: () => void;
  /** Browser Back closed the open profile panel. */
  onPopProfile: () => void;
};

/**
 * Gives the chat's inner screens (an open conversation, a profile panel) their own browser-history entries,
 * so the Back button first closes them and only then leaves the page. Without this, an open conversation is
 * just React state: Back skips straight past it to whatever page came before the chat (the dashboard).
 *
 * Opening pushes one entry; the in-app back arrow calls `history.back()` so there is a single source of truth.
 */
export function useChatHistory(handlers: Handlers) {
  const open = useRef<Record<Kind, boolean>>({ thread: false, profile: false });
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onPop = () => {
      // Innermost screen first: profile sits on top of the conversation.
      if (open.current.profile) {
        open.current.profile = false;
        latest.current.onPopProfile();
        return;
      }
      if (open.current.thread) {
        open.current.thread = false;
        latest.current.onPopThread();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const enter = useCallback((kind: Kind) => {
    if (open.current[kind]) return;
    try {
      // Keep Next.js's own history state so its router stays in sync on the same URL.
      window.history.pushState({ ...(window.history.state ?? {}), __chat: kind }, "", window.location.href);
      open.current[kind] = true;
    } catch {
      /* history unavailable: the screen still works, Back just behaves as before */
    }
  }, []);

  /** Returns true when a history entry was popped (the matching onPop handler will run). */
  const leave = useCallback((kind: Kind): boolean => {
    if (!open.current[kind]) return false;
    window.history.back();
    return true;
  }, []);

  /** The screen was closed some other way; stop treating its entry as open (it just stays in history). */
  const forget = useCallback((kind: Kind) => {
    open.current[kind] = false;
  }, []);

  return {
    enterThread: useCallback(() => enter("thread"), [enter]),
    leaveThread: useCallback(() => leave("thread"), [leave]),
    forgetThread: useCallback(() => forget("thread"), [forget]),
    enterProfile: useCallback(() => enter("profile"), [enter]),
    leaveProfile: useCallback(() => leave("profile"), [leave]),
    forgetProfile: useCallback(() => forget("profile"), [forget]),
  };
}
