import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chatUnreadIncreased,
  createSoundGate,
  detectArrivals,
  groupNotifications,
  latestCursor,
  mergeNotifications,
  relativeTime,
  titlePrefix,
} from "./notification-core";
import type { PortalNotification } from "./types";

const mk = (id: string, createdAt: string, extra: Partial<PortalNotification> = {}): PortalNotification => ({
  id,
  title: id,
  body: "",
  readAt: null,
  createdAt,
  type: "x",
  ...extra,
});

test("relativeTime buckets", () => {
  const now = Date.parse("2026-01-10T12:00:00Z");
  assert.equal(relativeTime("2026-01-10T11:59:50Z", now), "just now");
  assert.equal(relativeTime("2026-01-10T11:58:00Z", now), "2 min ago");
  assert.equal(relativeTime("2026-01-10T09:00:00Z", now), "3 h ago");
  assert.equal(relativeTime("2026-01-09T09:00:00Z", now), "Yesterday");
  assert.equal(relativeTime("2026-01-06T12:00:00Z", now), "4 d ago");
  assert.equal(relativeTime("garbage", now), "");
});

test("groupNotifications puts unread and pending first", () => {
  const g = groupNotifications([
    mk("a", "2026-01-01T00:00:00Z"),
    mk("b", "2026-01-01T00:00:00Z", { readAt: "x" }),
    mk("c", "2026-01-01T00:00:00Z", { readAt: "x", actionState: "pending" }),
  ]);
  assert.deepEqual(g.fresh.map((n) => n.id), ["a", "c"]);
  assert.deepEqual(g.earlier.map((n) => n.id), ["b"]);
});

test("detectArrivals ignores the initial load and already seen ids", () => {
  const first = detectArrivals(new Set(), [mk("a", "2026-01-01T00:00:00Z")], true);
  assert.equal(first.arrivals.length, 0);
  const second = detectArrivals(
    first.seen,
    [mk("a", "2026-01-01T00:00:00Z"), mk("b", "2026-01-02T00:00:00Z"), mk("c", "2026-01-03T00:00:00Z", { readAt: "x" })],
    false,
  );
  assert.deepEqual(second.arrivals.map((n) => n.id), ["b"]);
  const third = detectArrivals(second.seen, [mk("b", "2026-01-02T00:00:00Z")], false);
  assert.equal(third.arrivals.length, 0);
});

test("mergeNotifications replaces by id, sorts and caps", () => {
  const merged = mergeNotifications(
    [mk("a", "2026-01-01T00:00:00Z"), mk("b", "2026-01-02T00:00:00Z")],
    [mk("a", "2026-01-01T00:00:00Z", { readAt: "x" }), mk("c", "2026-01-03T00:00:00Z")],
    2,
  );
  assert.deepEqual(merged.map((n) => n.id), ["c", "b"]);
  const replaced = mergeNotifications(
    [mk("a", "2026-01-01T00:00:00Z")],
    [mk("a", "2026-01-01T00:00:00Z", { readAt: "x" })],
  );
  assert.equal(replaced[0].readAt, "x");
});

test("latestCursor picks the newest updatedAt", () => {
  assert.equal(latestCursor([]), null);
  assert.equal(
    latestCursor([mk("a", "2026-01-01T00:00:00Z", { updatedAt: "2026-01-05T00:00:00Z" }), mk("b", "2026-01-03T00:00:00Z")]),
    "2026-01-05T00:00:00Z",
  );
});

test("sound gate coalesces bursts", () => {
  const g = createSoundGate(800);
  assert.equal(g.tryPass(1000), true);
  assert.equal(g.tryPass(1500), false);
  assert.equal(g.tryPass(1900), true);
});

test("chatUnreadIncreased needs a known baseline", () => {
  assert.equal(chatUnreadIncreased(null, { total: 2, ok: true }), false);
  assert.equal(chatUnreadIncreased({ total: 0, ok: false }, { total: 2, ok: true }), false);
  assert.equal(chatUnreadIncreased({ total: 1, ok: true }, { total: 2, ok: true }), true);
  assert.equal(chatUnreadIncreased({ total: 2, ok: true }, { total: 1, ok: true }), false);
});

test("titlePrefix", () => {
  assert.equal(titlePrefix(0), "");
  assert.equal(titlePrefix(3), "(3) ");
  assert.equal(titlePrefix(150), "(99+) ");
});
