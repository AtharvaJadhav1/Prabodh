import { PlatformRole } from '@prisma/client';
import { allRoles } from './roles';

/** Roles that may use friends + direct messages. Admin-only accounts are deliberately excluded. */
export const CHAT_ROLES: PlatformRole[] = [
  PlatformRole.student,
  PlatformRole.institute_mentor,
  PlatformRole.industry_mentor,
  PlatformRole.student_expert,
  PlatformRole.support,
];

export const ROLE_LABELS: Partial<Record<PlatformRole, string>> = {
  student: 'Student',
  institute_mentor: 'Institute Mentor',
  industry_mentor: 'Industry Mentor',
  student_expert: 'Student Expert',
  support: 'Support',
};

export const MESSAGE_MAX_LENGTH = 2000;
export const CLIENT_ID_MAX_LENGTH = 64;
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const PREVIEW_MAX_LENGTH = 120;
export const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const DELETED_PREVIEW = 'This message was deleted';

// Control characters except tab (\x09) and newline (\x0A).
const CONTROL_CHARS = new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g');

type RoleCarrier = { platformRole: PlatformRole; additionalRoles?: PlatformRole[] | null };

/** The first held role (primary first) that grants chat access, or null for admin-only accounts. */
export function chatRoleOf(user: RoleCarrier): PlatformRole | null {
  return allRoles(user).find((r) => CHAT_ROLES.includes(r)) ?? null;
}

export function isChatEligible(user: RoleCarrier & { isActive?: boolean }): boolean {
  if (user.isActive === false) return false;
  return chatRoleOf(user) !== null;
}

export function roleLabel(role: PlatformRole | null): string {
  return (role && ROLE_LABELS[role]) || 'Member';
}

/** Canonical key for an unordered pair of users: ids sorted, joined with ':'. Symmetric. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export type BodyResult = { ok: true; body: string } | { ok: false; error: string };

/** Trims, unifies line endings, strips control characters and enforces 1..2000 chars. */
export function normalizeMessageBody(raw: unknown): BodyResult {
  if (typeof raw !== 'string') return { ok: false, error: 'Message cannot be empty.' };
  const body = raw.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').trim();
  if (!body) return { ok: false, error: 'Message cannot be empty.' };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message is too long (max ${MESSAGE_MAX_LENGTH} characters).` };
  }
  return { ok: true, body };
}

export type SearchQuery =
  | { ok: true; mode: 'text' | 'email'; value: string }
  | { ok: false; error: string };

/** Search needs at least 2 characters; anything with '@' is an exact-email lookup only. */
export function parseSearchQuery(raw: unknown): SearchQuery {
  const q = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (q.length < SEARCH_MIN_LENGTH) {
    return { ok: false, error: `Type at least ${SEARCH_MIN_LENGTH} characters to search.` };
  }
  if (q.length > SEARCH_MAX_LENGTH) {
    return { ok: false, error: 'Search text is too long.' };
  }
  if (q.includes('@')) return { ok: true, mode: 'email', value: q.toLowerCase() };
  return { ok: true, mode: 'text', value: q };
}

/** Parses a numeric limit query param, clamped to [1, max]. */
export function clampLimit(raw: unknown, fallback: number, max: number): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Single-line preview (<=120 chars, ellipsis when cut). Deleted messages get a fixed text. */
export function previewText(body: string, deleted = false, max = PREVIEW_MAX_LENGTH): string {
  if (deleted) return DELETED_PREVIEW;
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export type CursorPayload = { n: string; i: string };

export function encodeCursor(c: CursorPayload): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(raw: unknown): CursorPayload | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (v && typeof v.n === 'string' && typeof v.i === 'string') return { n: v.n, i: v.i };
  } catch {
    /* fall through */
  }
  return null;
}

export type FriendshipStatusLike = 'pending' | 'accepted' | 'declined';
export type ExistingFriendship = {
  requesterId: string;
  status: FriendshipStatusLike;
  respondedAt?: Date | null;
} | null;

export type FriendRequestDecision =
  | { action: 'create' }
  /** A declined row exists and may be revived as a fresh pending request from the actor. */
  | { action: 'recreate' }
  | { action: 'auto_accept' }
  | { action: 'noop' }
  | {
      action: 'reject';
      reason: 'self' | 'already_friends' | 'declined_cooldown';
      httpStatus: 400 | 409 | 429;
      message: string;
    };

export function declineCooldownRemainingMs(respondedAt: Date | null, now: Date = new Date()): number {
  if (!respondedAt) return 0;
  return Math.max(0, respondedAt.getTime() + DECLINE_COOLDOWN_MS - now.getTime());
}

/**
 * What should happen when `actorId` asks `targetId` to be friends, given the pair's existing row.
 * Pure: the caller performs the write (guarded by a status check) and notifies.
 */
export function decideFriendRequest(input: {
  actorId: string;
  targetId: string;
  existing: ExistingFriendship;
  now?: Date;
}): FriendRequestDecision {
  const { actorId, targetId, existing } = input;
  const now = input.now ?? new Date();
  if (actorId === targetId) {
    return {
      action: 'reject',
      reason: 'self',
      httpStatus: 400,
      message: 'You cannot send a friend request to yourself.',
    };
  }
  if (!existing) return { action: 'create' };
  if (existing.status === 'accepted') {
    return { action: 'reject', reason: 'already_friends', httpStatus: 409, message: 'You are already friends.' };
  }
  if (existing.status === 'pending') {
    return existing.requesterId === actorId ? { action: 'noop' } : { action: 'auto_accept' };
  }
  // declined: the person who was declined must wait; the person who declined may ask freely.
  if (existing.requesterId === actorId && declineCooldownRemainingMs(existing.respondedAt ?? null, now) > 0) {
    return {
      action: 'reject',
      reason: 'declined_cooldown',
      httpStatus: 429,
      message: 'Your earlier request was declined. You can send a new one after 24 hours.',
    };
  }
  return { action: 'recreate' };
}

/* ---------------- profile sanitising ---------------- */

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, max) : null;
}

/** Multi-line text (bio): keeps newlines, collapses runs of blank lines. */
export function cleanParagraph(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').replace(/\n{3,}/g, '\n\n').trim();
  return t ? t.slice(0, max) : null;
}

export function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const raw =
      typeof item === 'string' ? item : item && typeof item === 'object' ? (item as { name?: unknown }).name : null;
    const t = cleanText(raw, maxLen);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** http(s) links only - never javascript:/data: targets. */
export function safeHttpUrl(v: unknown, max = 300): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > max || !/^https?:\/\//i.test(t)) return null;
  return t;
}

/**
 * Picks the safe public subset of the untyped profileJson blob. Never reads contacts/phone/email.
 * Skills live in `skills.primary[{name}]`, `skills.secondary[]`, `skills.tracks[]` (student editor).
 */
export function safeProfileFromJson(json: unknown) {
  const p = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  const skills = (p.skills && typeof p.skills === 'object' ? p.skills : {}) as Record<string, unknown>;
  const skillList = Array.isArray(p.skills)
    ? cleanList(p.skills, 20, 40)
    : cleanList(
        [
          ...(Array.isArray(skills.primary) ? skills.primary : []),
          ...(Array.isArray(skills.secondary) ? skills.secondary : []),
        ],
        20,
        40,
      );
  return {
    headline: cleanText(p.headline, 120) ?? cleanText(p.role, 120),
    bio: cleanParagraph(p.bio, 600),
    skills: skillList,
    tracks: cleanList(skills.tracks, 10, 40),
  };
}

/** Inline data: avatars can be megabytes - lists drop the oversized ones (UI falls back to initials). */
export function safeAvatarUrl(json: unknown, maxLen = 2048): string | null {
  const p = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const v = typeof p.avatarUrl === 'string' ? p.avatarUrl.trim() : '';
  if (!v || v.length > maxLen) return null;
  if (/^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v)) return v;
  return null;
}
