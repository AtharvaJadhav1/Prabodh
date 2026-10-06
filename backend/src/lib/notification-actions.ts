/**
 * Actionable notifications: a notification may carry a structured action (kind + ref) so the user
 * can accept/decline the underlying request straight from the bell. Pure helpers only (no DB).
 */
import { PlatformRole } from '@prisma/client';

export const NOTIFICATION_ACTION_KINDS = ['team_invite', 'mentor_invite', 'friend_request', 'join_request'] as const;
export type NotificationActionKind = (typeof NOTIFICATION_ACTION_KINDS)[number];

export const NOTIFICATION_ACTION_STATES = ['pending', 'accepted', 'declined', 'expired'] as const;
export type NotificationActionState = (typeof NOTIFICATION_ACTION_STATES)[number];

export type NotificationDecision = 'accept' | 'decline';

export type NotificationAction = { kind: NotificationActionKind; ref: string };

export function isActionKind(value: unknown): value is NotificationActionKind {
  return typeof value === 'string' && (NOTIFICATION_ACTION_KINDS as readonly string[]).includes(value);
}

/** Returns a clean action, or null when kind/ref are missing or invalid (never throws). */
export function normalizeAction(action: { kind?: unknown; ref?: unknown } | null | undefined): NotificationAction | null {
  if (!action || !isActionKind(action.kind)) return null;
  if (typeof action.ref !== 'string' || !action.ref.trim()) return null;
  return { kind: action.kind, ref: action.ref.trim() };
}

export function parseDecision(value: unknown): NotificationDecision | null {
  return value === 'accept' || value === 'decline' ? value : null;
}

export function stateForDecision(decision: NotificationDecision): 'accepted' | 'declined' {
  return decision === 'accept' ? 'accepted' : 'declined';
}

/** TeamMember / MentorInvite status -> action state. A missing row or a frozen team is 'expired'. */
export function inviteActionState(
  status: string | null | undefined,
  opts: { frozen?: boolean } = {},
): NotificationActionState {
  if (!status) return 'expired';
  switch (status) {
    case 'accepted':
      return 'accepted';
    case 'revoked':
      return 'declined';
    case 'expired':
      return 'expired';
    case 'pending':
      return opts.frozen ? 'expired' : 'pending';
    default:
      return 'expired';
  }
}

/** JoinRequest status -> action state (rejected = declined). */
export function joinRequestActionState(
  status: string | null | undefined,
  opts: { frozen?: boolean } = {},
): NotificationActionState {
  if (!status) return 'expired';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'declined';
  if (status === 'pending') return opts.frozen ? 'expired' : 'pending';
  return 'expired';
}

/** Friendship status -> action state. A cancelled request deletes the row (missing => expired). */
export function friendActionState(status: string | null | undefined): NotificationActionState {
  if (!status) return 'expired';
  if (status === 'accepted') return 'accepted';
  if (status === 'declined') return 'declined';
  if (status === 'pending') return 'pending';
  return 'expired';
}

/** Mirrors the @Roles(...) guards on the endpoints each action dispatches to. */
export function rolesAllowedFor(kind: NotificationActionKind): PlatformRole[] | null {
  switch (kind) {
    case 'team_invite':
      return [PlatformRole.student];
    case 'mentor_invite':
      return [PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin];
    default:
      return null; // friend + join-request endpoints have no role gate (service enforces ownership)
  }
}
