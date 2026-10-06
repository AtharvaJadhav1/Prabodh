"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ApiError, api, apiPatch, apiPost } from "../../lib/api";
import { invalidateApiCache } from "../../lib/api-cache";
import { emitAppRefresh, type AppRefreshKind } from "../../lib/app-refresh";
import {
  countUnread,
  detectArrivals,
  latestCursor,
  mergeNotifications,
} from "../../lib/notification-core";
import type { NotificationActionKind, NotificationActionState, PortalNotification } from "../../lib/types";

/**
 * Single shared notification store: ONE poll feeds the bell, the toasts, the sounds and the tab title.
 * Module-level state exposed through useSyncExternalStore; the poll is owned by `useNotificationPolling`
 * (mounted once by NotificationRuntime).
 */

export type NotificationSnapshot = {
  items: PortalNotification[];
  unreadCount: number;
  loaded: boolean;
  panelOpen: boolean;
};

const EMPTY: NotificationSnapshot = { items: [], unreadCount: 0, loaded: false, panelOpen: false };

const VISIBLE_POLL_MS = 15_000;
const HIDDEN_POLL_MS = 60_000;
const MAX_BACKOFF_MS = 120_000;
const FULL_REFRESH_EVERY = 20;
const WAKE_MIN_GAP_MS = 1_500;
const CURSOR_SLACK_MS = 2_000;

let snap: NotificationSnapshot = EMPTY;
const listeners = new Set<() => void>();
const arrivalListeners = new Set<(items: PortalNotification[]) => void>();

// poll engine state
let activeUser: string | null = null;
let gen = 0;
let seen = new Set<string>();
let cursor: string | null = null;
let incrementals = 0;
let initialDone = false;
let running = false;
let halted = false;
let failures = 0;
let lastPollAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let controller: AbortController | null = null;
let locallyRead = new Set<string>();

function setSnap(patch: Partial<NotificationSnapshot>) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

function setItems(items: PortalNotification[]) {
  setSnap({ items, unreadCount: countUnread(items) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotificationSnapshot(): NotificationSnapshot {
  return snap;
}

export function useNotifications(): NotificationSnapshot {
  return useSyncExternalStore(subscribe, getNotificationSnapshot, () => EMPTY);
}

/** Called with the genuinely new, unread rows each time the poll discovers some. */
export function subscribeNotificationArrivals(cb: (items: PortalNotification[]) => void): () => void {
  arrivalListeners.add(cb);
  return () => {
    arrivalListeners.delete(cb);
  };
}

function isHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function clearTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function scheduleNext() {
  clearTimer();
  if (!activeUser || halted) return;
  const base = isHidden() ? HIDDEN_POLL_MS : VISIBLE_POLL_MS;
  const delay = failures === 0 ? base : Math.min(MAX_BACKOFF_MS, base * 2 ** Math.min(failures, 3));
  timer = setTimeout(() => void poll(), delay);
}

function isAbort(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    ((err as { name: unknown }).name === "AbortError" || (err as { name: unknown }).name === "TimeoutError")
  );
}

async function poll(forceFull = false): Promise<void> {
  if (!activeUser || running || halted) return;
  running = true;
  clearTimer();
  const myGen = gen;
  const ctl = new AbortController();
  controller = ctl;
  lastPollAt = Date.now();
  const incremental = !forceFull && initialDone && cursor !== null && incrementals < FULL_REFRESH_EVERY;
  try {
    let path = "/notifications";
    if (incremental && cursor) {
      const since = new Date(new Date(cursor).getTime() - CURSOR_SLACK_MS).toISOString();
      path = `/notifications?since=${encodeURIComponent(since)}`;
    }
    const rows = await api<PortalNotification[]>(path, { signal: ctl.signal });
    if (myGen !== gen) return;
    if (!Array.isArray(rows)) throw new Error("Unexpected notifications payload");
    failures = 0;

    const nowIso = new Date().toISOString();
    const fixed = rows.map((r) => (locallyRead.has(r.id) && !r.readAt ? { ...r, readAt: nowIso } : r));
    const result = detectArrivals(seen, fixed, !initialDone);
    seen = result.seen;
    const items = incremental ? mergeNotifications(snap.items, fixed) : mergeNotifications([], fixed);
    const next = latestCursor(items);
    if (next && (!cursor || new Date(next).getTime() > new Date(cursor).getTime())) cursor = next;
    incrementals = incremental ? incrementals + 1 : 0;
    initialDone = true;
    setSnap({ items, unreadCount: countUnread(items), loaded: true });
    if (result.arrivals.length) arrivalListeners.forEach((l) => l(result.arrivals));
  } catch (err) {
    if (myGen !== gen || isAbort(err)) return;
    if (err instanceof ApiError && err.status === 401) halted = true;
    else failures += 1;
    if (!snap.loaded) setSnap({ loaded: true });
  } finally {
    if (myGen === gen) {
      running = false;
      controller = null;
      scheduleNext();
    }
  }
}

/** Fetch right now (e.g. after the user acted elsewhere). */
export function refreshNotificationsNow(): void {
  if (Date.now() - lastPollAt < 400) return;
  void poll();
}

function resetEngine() {
  gen += 1;
  clearTimer();
  controller?.abort();
  controller = null;
  running = false;
  halted = false;
  failures = 0;
  seen = new Set();
  cursor = null;
  incrementals = 0;
  initialDone = false;
  lastPollAt = 0;
  locallyRead = new Set();
}

function startPolling(userId: string): () => void {
  resetEngine();
  activeUser = userId;
  const wake = () => {
    if (!activeUser || isHidden()) return;
    if (Date.now() - lastPollAt < WAKE_MIN_GAP_MS) {
      scheduleNext();
      return;
    }
    failures = 0;
    void poll();
  };
  const onVisibility = () => (isHidden() ? scheduleNext() : wake());
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", wake);
  window.addEventListener("online", wake);
  void poll();
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", wake);
    window.removeEventListener("online", wake);
    activeUser = null;
    resetEngine();
    snap = EMPTY;
    listeners.forEach((l) => l());
  };
}

/** Owns the poll. Mount once (NotificationRuntime). Pass null when signed out. */
export function useNotificationPolling(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    return startPolling(userId);
  }, [userId]);
}

// ---------------------------------------------------------------- read state

function markLocalRead(ids: string[]) {
  if (!ids.length) return;
  const set = new Set(ids);
  const nowIso = new Date().toISOString();
  ids.forEach((id) => locallyRead.add(id));
  setItems(snap.items.map((n) => (set.has(n.id) && !n.readAt ? { ...n, readAt: nowIso } : n)));
}

export function markNotificationRead(id: string): void {
  const row = snap.items.find((n) => n.id === id);
  if (!row || row.readAt) return;
  markLocalRead([id]);
  void apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {}).catch(() => undefined);
}

export function markAllNotificationsRead(): void {
  const ids = snap.items.filter((n) => !n.readAt).map((n) => n.id);
  if (!ids.length) return;
  markLocalRead(ids);
  void Promise.all(ids.map((id) => apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {}).catch(() => undefined)));
}

export function setNotificationPanelOpen(open: boolean): void {
  if (snap.panelOpen === open) return;
  if (!open) {
    // Closing the panel counts as having seen what was listed. Unanswered invites stay unread.
    const ids = snap.items.filter((n) => !n.readAt && n.actionState !== "pending").map((n) => n.id);
    markLocalRead(ids);
    ids.forEach((id) => void apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {}).catch(() => undefined));
  }
  setSnap({ panelOpen: open });
}

// ---------------------------------------------------------------- actions

export type ActionDecision = "accept" | "decline";

export type ActionOutcome =
  | { status: "done"; message: string; actionState: NotificationActionState | null }
  | { status: "handled"; message: string; actionState: NotificationActionState | null }
  | { status: "confirm"; message: string; requiresSuccessor?: boolean }
  | { status: "error"; message: string };

type ActionOk = {
  ok: boolean;
  actionState?: NotificationActionState | null;
  message?: string;
  notification?: PortalNotification | null;
};

function refreshKindsFor(kind: NotificationActionKind | null | undefined): AppRefreshKind[] {
  if (kind === "team_invite" || kind === "join_request") return ["team"];
  if (kind === "mentor_invite") return ["mentor"];
  if (kind === "friend_request") return ["friends"];
  return [];
}

function applyServerRow(id: string, state: NotificationActionState | null | undefined, row: PortalNotification | null | undefined) {
  const nowIso = new Date().toISOString();
  locallyRead.add(id);
  setItems(
    snap.items.map((n) => {
      if (n.id !== id) return n;
      const base = row ? { ...n, ...row } : n;
      return { ...base, actionState: state ?? base.actionState ?? null, readAt: base.readAt ?? nowIso };
    }),
  );
}

function bodyOf(err: unknown): { code?: string; actionState?: NotificationActionState | null; message?: string; requiresSuccessor?: boolean; notification?: PortalNotification | null } {
  if (err instanceof ApiError && typeof err.details === "object" && err.details !== null) {
    return err.details as ReturnType<typeof bodyOf>;
  }
  return {};
}

/** Accept / decline an actionable notification. Never throws; the outcome says what to show inline. */
export async function performNotificationAction(
  id: string,
  decision: ActionDecision,
  confirmSwitch = false,
): Promise<ActionOutcome> {
  const row = snap.items.find((n) => n.id === id);
  const kind = row?.actionKind ?? null;
  try {
    const res = await apiPost<ActionOk>(`/notifications/${encodeURIComponent(id)}/action`, {
      decision,
      ...(confirmSwitch ? { confirmSwitch: true } : {}),
    });
    const state: NotificationActionState | null = res.actionState ?? (decision === "accept" ? "accepted" : "declined");
    applyServerRow(id, state, res.notification);
    void apiPatch(`/notifications/${encodeURIComponent(id)}/read`, {}).catch(() => undefined);
    invalidateAfterAction(kind);
    emitAppRefresh(...refreshKindsFor(kind));
    return { status: "done", actionState: state, message: res.message || (decision === "accept" ? "Accepted" : "Declined") };
  } catch (err) {
    const body = bodyOf(err);
    if (err instanceof ApiError && err.status === 409) {
      if (body.code === "NEEDS_CONFIRMATION") {
        return {
          status: "confirm",
          message: body.message || "Accepting will move you out of your current team. Continue?",
          ...(body.requiresSuccessor ? { requiresSuccessor: true } : {}),
        };
      }
      if (body.code === "ALREADY_HANDLED") {
        applyServerRow(id, body.actionState ?? "expired", body.notification);
        invalidateAfterAction(kind);
        emitAppRefresh(...refreshKindsFor(kind));
        return { status: "handled", actionState: body.actionState ?? null, message: body.message || "Already handled." };
      }
    }
    if (err instanceof ApiError && err.status === 404) {
      return { status: "error", message: "This notification is no longer available." };
    }
    if (err instanceof ApiError && err.status === 403) {
      return { status: "error", message: "You can't respond to this one." };
    }
    return {
      status: "error",
      message: err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.",
    };
  }
}

/** Provider data is API-cached for up to 60s; drop it so the provider reload sees the new state. */
function invalidateAfterAction(kind: NotificationActionKind | null) {
  if (kind === "mentor_invite") invalidateApiCache(/\/(teams|mentors|admin|industrial-mentors)(\/|$)/);
  else if (kind === "team_invite" || kind === "join_request") invalidateApiCache(/\/(teams|join-requests)(\/|$)/);
}
