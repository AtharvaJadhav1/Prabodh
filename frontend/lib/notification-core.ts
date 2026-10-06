import type { PortalNotification } from "./types";

/** Pure helpers behind the notification bell, toasts and sounds (no DOM / React access). */

export const MAX_NOTIFICATIONS = 100;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "2 min ago", "3 h ago", "Yesterday", "5 d ago", then a short date. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = now - t;
  if (diff < 45_000) return "just now";
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
  if (diff < 2 * DAY) return "Yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export type NotificationGroups = { fresh: PortalNotification[]; earlier: PortalNotification[] };

/** "New" = unread (or an actionable item still waiting on an answer); everything else is "Earlier". */
export function groupNotifications(items: readonly PortalNotification[]): NotificationGroups {
  const fresh: PortalNotification[] = [];
  const earlier: PortalNotification[] = [];
  for (const n of items) {
    if (!n.readAt || n.actionState === "pending") fresh.push(n);
    else earlier.push(n);
  }
  return { fresh, earlier };
}

export function countUnread(items: readonly PortalNotification[]): number {
  let n = 0;
  for (const item of items) if (!item.readAt) n += 1;
  return n;
}

function byNewest(a: PortalNotification, b: PortalNotification) {
  return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0);
}

/** Merge incoming rows over the existing list by id (incoming wins), newest first, capped. */
export function mergeNotifications(
  existing: readonly PortalNotification[],
  incoming: readonly PortalNotification[],
  cap: number = MAX_NOTIFICATIONS,
): PortalNotification[] {
  const map = new Map<string, PortalNotification>();
  for (const n of existing) map.set(n.id, n);
  for (const n of incoming) map.set(n.id, n);
  return [...map.values()].sort(byNewest).slice(0, cap);
}

/** Latest updatedAt (falling back to createdAt) across rows: the cursor for `?since=`. */
export function latestCursor(items: readonly PortalNotification[]): string | null {
  let best = 0;
  let bestIso: string | null = null;
  for (const n of items) {
    const iso = n.updatedAt ?? n.createdAt;
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && t > best) {
      best = t;
      bestIso = iso;
    }
  }
  return bestIso;
}

export type ArrivalResult = { arrivals: PortalNotification[]; seen: Set<string> };

/**
 * Work out which rows are genuinely new. The first load only fills the seen-set so existing
 * unread items never trigger a sound / toast. Later, an id never seen before that is still unread
 * is an arrival (newest first).
 */
export function detectArrivals(
  seen: ReadonlySet<string>,
  incoming: readonly PortalNotification[],
  isInitial: boolean,
): ArrivalResult {
  const next = new Set(seen);
  const arrivals: PortalNotification[] = [];
  for (const n of incoming) {
    const known = next.has(n.id);
    next.add(n.id);
    if (!isInitial && !known && !n.readAt) arrivals.push(n);
  }
  arrivals.sort(byNewest);
  return { arrivals, seen: next };
}

/** True when the chat unread total grew compared with an already-known previous value. */
export function chatUnreadIncreased(prev: { total: number; ok: boolean } | null, next: { total: number; ok: boolean }) {
  return !!prev && prev.ok && next.ok && next.total > prev.total;
}

/** Allows at most one sound per `minGapMs`; bursts are coalesced into the first. */
export function createSoundGate(minGapMs = 800) {
  let last = Number.NEGATIVE_INFINITY;
  return {
    tryPass(now: number = Date.now()): boolean {
      if (now - last < minGapMs) return false;
      last = now;
      return true;
    },
    reset() {
      last = Number.NEGATIVE_INFINITY;
    },
  };
}

/** Title prefix like "(3) " for the document title; empty when nothing is unread. */
export function titlePrefix(unread: number): string {
  if (unread <= 0) return "";
  return `(${unread > 99 ? "99+" : unread}) `;
}
