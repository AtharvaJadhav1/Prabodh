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
  return `You are the Team Lead of ${teamName}. Please transfer Team Lead ownership to another teammate or disband the team before deleting your account.`;
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
 * Full blocker list for a self-delete, in the order they should be shown. Deliberately a hard
 * block on multi-member teams: the admin path promotes a successor instead, but silently handing
 * someone's team to a teammate is not what they asked for when they delete their own account.
 */
export function selfDeleteBlockers(opts: {
  isAdmin: boolean;
  /** Active admins other than the caller. Only meaningful when `isAdmin` is true. */
  otherActiveAdmins?: number;
  ledTeams: LedTeam[];
  selfId: string;
}): string[] {
  const blockers: string[] = [];
  if (opts.isAdmin && (opts.otherActiveAdmins ?? 0) === 0) {
    blockers.push(SOLE_ADMIN_BLOCKER);
  }
  for (const t of partitionLedTeams(opts.ledTeams, opts.selfId).blocking) {
    blockers.push(teamLeadBlocker(t.name));
  }
  return blockers;
}

/** Accepts either the literal word DELETE or the user's own address, case-insensitive. */
export function confirmationMatches(typed: string, email: string): boolean {
  const value = typed.trim().toLowerCase();
  return value === 'delete' || value === email.trim().toLowerCase();
}