import type { ChatMessage } from "./chat-types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayDiff(then: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
}

/** HH:mm in the viewer's locale (24h/12h follows the browser). */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Conversation-list stamp: today HH:mm, "Yesterday", weekday within a week, otherwise a date. */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = dayDiff(d, now);
  if (diff <= 0) return formatClock(iso);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return WEEKDAYS[d.getDay()];
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Day separator label inside a thread. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = dayDiff(d, now);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return WEEKDAYS[d.getDay()];
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function formatMemberSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type TextSegment = { type: "text"; text: string } | { type: "link"; text: string; href: string };

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

/** Split text into plain and http(s) link segments. Never produces javascript:/data: links. */
export function linkify(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let url = m[0];
    // Keep a closing paren when the URL itself contains its opening pair (wikipedia style).
    const trail = url.match(TRAILING_PUNCT)?.[0] ?? "";
    let strip = trail;
    if (trail.startsWith(")") && url.includes("(")) strip = "";
    url = strip ? url.slice(0, url.length - strip.length) : url;
    if (!isSafeHttpUrl(url)) continue;
    if (start > last) out.push({ type: "text", text: text.slice(last, start) });
    out.push({ type: "link", text: url, href: url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export type TimelineItem =
  | { type: "day"; key: string; label: string }
  | {
      type: "msg";
      key: string;
      msg: ChatMessage;
      /** First of a run from the same sender (gets the bubble tail and sender name). */
      first: boolean;
      last: boolean;
    };

const GROUP_GAP_MS = 5 * 60_000;

/** Insert day separators and mark consecutive same-sender runs. Input must be oldest to newest. */
export function buildTimeline(messages: ChatMessage[], now: Date = new Date()): TimelineItem[] {
  const out: TimelineItem[] = [];
  let prev: ChatMessage | null = null;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const newDay = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
    if (newDay) {
      out.push({ type: "day", key: `day-${dayKey(msg.createdAt)}`, label: formatDayLabel(msg.createdAt, now) });
    }
    const next = messages[i + 1];
    const sameAsPrev =
      !newDay &&
      prev !== null &&
      prev.senderId === msg.senderId &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS;
    const sameAsNext =
      next !== undefined &&
      dayKey(next.createdAt) === dayKey(msg.createdAt) &&
      next.senderId === msg.senderId &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < GROUP_GAP_MS;
    out.push({ type: "msg", key: msg.key, msg, first: !sameAsPrev, last: !sameAsNext });
    prev = msg;
  }
  return out;
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0][0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (a + b).toUpperCase();
}

export function roleChipLabel(role: string | null | undefined): string | null {
  switch (role) {
    case "institute_mentor":
      return "Faculty Mentor";
    case "industry_mentor":
      return "Industry Mentor";
    case "student_expert":
      return "Student Expert";
    default:
      return null;
  }
}
