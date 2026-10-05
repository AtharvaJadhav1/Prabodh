"use client";

import { useCallback, useEffect, useRef } from "react";
import { isAbortError } from "../../lib/chat-api";

type Options = {
  /** Base delay between runs in milliseconds. */
  intervalMs: number;
  enabled?: boolean;
  /** Run once right away when (re)enabled. Default true. */
  immediate?: boolean;
  maxBackoffMs?: number;
  onError?: (err: unknown) => void;
};

/**
 * Adaptive polling: pauses while the tab is hidden, refreshes immediately on focus/visibility,
 * backs off exponentially on errors, aborts the in-flight request on unmount or when `enabled`
 * or `resetKey` change. The task should throw on failure so the backoff engages.
 */
export function useChatPolling(
  task: (signal: AbortSignal) => Promise<void>,
  { intervalMs, enabled = true, immediate = true, maxBackoffMs = 60_000, onError }: Options,
  resetKey?: string | null,
): { refresh: () => void } {
  const taskRef = useRef(task);
  const errRef = useRef(onError);
  const runNowRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    taskRef.current = task;
    errRef.current = onError;
  });

  useEffect(() => {
    if (!enabled) {
      runNowRef.current = () => undefined;
      return;
    }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let running = false;
    let failures = 0;
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

    const clear = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clear();
      if (disposed || hidden()) return;
      const delay = failures === 0 ? intervalMs : Math.min(maxBackoffMs, intervalMs * 2 ** Math.min(failures, 6));
      timer = setTimeout(run, delay);
    };

    async function run() {
      clear();
      if (disposed || running) return;
      if (hidden()) return;
      running = true;
      controller = new AbortController();
      try {
        await taskRef.current(controller.signal);
        failures = 0;
      } catch (err) {
        if (!disposed && !isAbortError(err)) {
          failures += 1;
          errRef.current?.(err);
        }
      } finally {
        running = false;
        controller = null;
        schedule();
      }
    }

    const wake = () => {
      if (disposed || hidden()) return;
      // Coming back to the tab: drop any backoff and refresh now.
      failures = 0;
      if (!running) void run();
    };

    runNowRef.current = wake;
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    if (immediate) void run();
    else schedule();

    return () => {
      disposed = true;
      clear();
      controller?.abort();
      runNowRef.current = () => undefined;
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, [enabled, intervalMs, immediate, maxBackoffMs, resetKey]);

  const refresh = useCallback(() => runNowRef.current(), []);
  return { refresh };
}
