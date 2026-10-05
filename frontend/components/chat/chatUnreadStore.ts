"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getChatUnread } from "../../lib/chat-api";

type UnreadState = { total: number; ok: boolean };

const POLL_MS = 20_000;
const MAX_BACKOFF_MS = 120_000;

let state: UnreadState = { total: 0, ok: false };
const listeners = new Set<() => void>();
const SERVER_STATE: UnreadState = { total: 0, ok: false };

let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let controller: AbortController | null = null;
let failures = 0;
let running = false;
let teardown: (() => void) | null = null;

function emit(next: UnreadState) {
  if (next.total === state.total && next.ok === state.ok) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Authoritative total pushed from the conversation list poll so badges update without extra calls. */
export function setChatUnreadTotal(total: number) {
  emit({ total: Math.max(0, total), ok: true });
}

function hidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function schedule() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (subscribers === 0 || hidden()) return;
  const delay = failures === 0 ? POLL_MS : Math.min(MAX_BACKOFF_MS, POLL_MS * 2 ** Math.min(failures, 4));
  timer = setTimeout(() => void tick(), delay);
}

async function tick() {
  if (running || subscribers === 0 || hidden()) return;
  running = true;
  controller = new AbortController();
  try {
    const res = await getChatUnread({ signal: controller.signal });
    failures = 0;
    emit({ total: res.total, ok: true });
  } catch (err) {
    const name = typeof err === "object" && err !== null && "name" in err ? String((err as { name: unknown }).name) : "";
    if (name !== "AbortError") failures += 1;
  } finally {
    running = false;
    controller = null;
    schedule();
  }
}

function start() {
  const wake = () => {
    if (hidden()) return;
    failures = 0;
    void tick();
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  teardown = () => {
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", wake);
  };
  void tick();
}

function stop() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  controller?.abort();
  controller = null;
  teardown?.();
  teardown = null;
  failures = 0;
  state = { total: 0, ok: false };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Shared unread-message counter for sidebars and the workspace. Polls /chat/unread every ~20s
 * while at least one component is mounted. `ok` is false until the endpoint has answered once, so
 * callers can fall back to their previous badge source.
 */
export function useChatUnread(enabled = true): UnreadState {
  useEffect(() => {
    if (!enabled) return;
    subscribers += 1;
    if (subscribers === 1) start();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [enabled]);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
