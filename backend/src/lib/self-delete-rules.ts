import { InviteStatus } from '@prisma/client';

/**
 * Pure pre-condition rules for self-service account deletion, kept free of Prisma/Nest imports
 * so they can be unit tested without booting the app (importing the service pulls in the
 * queue/Redis stack).
 */

export type LedTeam = {
  id: string;
  name: string;
  members: Array<{ userId: string | null; inviteStatus: string }>;
};

export const SOLE_ADMIN_BLOCKER =
  'You are the only active admin. Promote another admin before deleting your account.';

export function teamLeadBlocker(teamName: string): string {
  return `You are the Team Lead of ${teamName}. Choose a teammate to take over as Team Lead before deleting your account.`;
}

/** Accepted teammates on a team, excluding the lead themself. A team with none is solo. */
export function acceptedOthers(
  members: Array<{ userId: string | null; inviteStatus: string }>,
  selfId: string,
): number {
  return members.filter(
    (m) => m.inviteStatus === InviteStatus.accepted && m.userId !== null && m.userId !== selfId,
  ).length;
}

/**
 * Split the caller's led teams into the ones that can be deleted with the account (solo) and
 * the ones that block it. Pending invites do not count as teammates — a team whose only other
 * member row is an unaccepted invite is still effectively solo, so it is deleted rather than
 * blocking someone from leaving.
 */
export function partitionLedTeams(ledTeams: LedTeam[], selfId: string) {
  const solo: LedTeam[] = [];
  const blocking: LedTeam[] = [];
  for (const t of ledTeams) {
    (acceptedOthers(t.members, selfId) > 0 ? blocking : solo).push(t);
  }
  return { solo, blocking };
}

/**
 * Whether `chosenUserId` is a valid successor for `team`: an accepted member other than the
 * lead themself. Used to validate a caller-supplied pick rather than auto-selecting one, since
 * self-delete lets the lead choose instead of silently promoting the earliest-joined member.
 */
export function invalidSuccessor(team: LedTeam, chosenUserId: string | undefined, selfId: string): boolean {
  if (!chosenUserId) return true;
  return !team.members.some(
    (m) => m.userId === chosenUserId && m.userId !== selfId && m.inviteStatus === InviteStatus.accepted,
  );
}

/**
 * Full blocker list for a self-delete, in the order they should be shown. A multi-member team
 * only blocks until the lead picks a valid successor for it (`successors[team.id]`); the admin
 * path auto-promotes instead, but self-delete lets the lead choose who takes over.
 */
export function selfDeleteBlockers(opts: {
  isAdmin: boolean;
  /** Active admins other than the caller. Only meaningful when `isAdmin` is true. */
  otherActiveAdmins?: number;
  ledTeams: LedTeam[];
  selfId: string;
  /** Caller-chosen successor per blocking team id. Omitted teams are treated as unresolved. */
  successors?: Record<string, string>;
}): string[] {
  const blockers: string[] = [];
  if (opts.isAdmin && (opts.otherActiveAdmins ?? 0) === 0) {
    blockers.push(SOLE_ADMIN_BLOCKER);
  }
  for (const t of partitionLedTeams(opts.ledTeams, opts.selfId).blocking) {
    if (invalidSuccessor(t, opts.successors?.[t.id], opts.selfId)) {
      blockers.push(teamLeadBlocker(t.name));
    }
  }
  return blockers;
}

/** Accepts either the literal word DELETE or the user's own address, case-insensitive. */
export function confirmationMatches(typed: string, email: string): boolean {
  const value = typed.trim().toLowerCase();
  return value === 'delete' || value === email.trim().toLowerCase();
}