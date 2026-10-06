"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { getPerson, isAbortError } from "../../lib/chat-api";
import type { ChatPersonDetail } from "../../lib/chat-types";

export type PersonDetailState = {
  detail: ChatPersonDetail | null;
  error: string | null;
  retry: () => void;
};

/** Loads one person's profile (abortable, unmount-safe). */
export function usePersonDetail(userId: string): PersonDetailState {
  const [detail, setDetail] = useState<ChatPersonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError(null);
    getPerson(userId, { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setDetail(d);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setError(err instanceof Error && err.message ? err.message : "Could not load this profile.");
      });
    return () => controller.abort();
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { detail, error, retry };
}

/**
 * Modal behaviour for a dialog panel: focus the initial element, restore focus on unmount, close on Escape and
 * keep Tab inside the panel.
 */
export function useModalFocus(
  panelRef: RefObject<HTMLElement | null>,
  initialRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    initialRef.current?.focus();
    return () => {
      if (prevFocus && document.contains(prevFocus)) prevFocus.focus();
    };
  }, [initialRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, panelRef]);
}
