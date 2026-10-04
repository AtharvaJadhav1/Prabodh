import { MentorType, PlatformRole } from '@prisma/client';
import { hasRole } from './roles';

/** The mentor flavour a role works as: institute_mentor -> institute, industry_mentor -> industry. */
export function mentorTypeForRole(role: PlatformRole | null | undefined): MentorType | undefined {
  if (role === PlatformRole.institute_mentor) return MentorType.institute;
  if (role === PlatformRole.industry_mentor) return MentorType.industry;
  return undefined;
}

/** The platform role required to take a seat of this mentor type. */
export function mentorRoleFor(type: MentorType): PlatformRole {
  return type === MentorType.institute ? PlatformRole.institute_mentor : PlatformRole.industry_mentor;
}

/** Accepts the `?mentorType=` query value; anything else means "no workspace filter". */
export function parseMentorTypeQuery(value: string | undefined): MentorType | undefined {
  return value === 'institute' || value === 'industry' ? (value as MentorType) : undefined;
}

type AssignmentLike = { mentorUserId: string; mentorType: MentorType; active: boolean };

/**
 * One person can hold at most ONE mentor seat on a team. Dual-role accounts (institute + industry)
 * must not end up as both the faculty and the industrial mentor of the same team.
 * Returns a user-facing reason, or null when the candidate may take the seat.
 */
export function seatConflict(
  assignments: AssignmentLike[],
  candidateUserId: string,
  wantedType: MentorType,
): string | null {
  const mine = assignments.find((a) => a.active && a.mentorUserId === candidateUserId);
  if (!mine) return null;
  if (mine.mentorType === wantedType) return 'This mentor is already assigned to the team in that role.';
  return mine.mentorType === MentorType.institute
    ? 'This person is already the faculty mentor of this team and cannot also be its industrial mentor.'
    : 'This person is already the industrial mentor of this team and cannot also be its faculty mentor.';
}

export function isSelfInvite(inviterUserId: string, inviteeUserId: string): boolean {
  return inviterUserId === inviteeUserId;
}

type TimestampedAssignment = { mentorType: MentorType | string; assignedAt: Date; createdAt: Date };

/**
 * Defense-in-depth against legacy/racy data: a team should have at most one
 * active assignment per mentorType. If duplicates slip through, keep only the
 * most recently assigned row per type (assignedAt desc, createdAt tiebreak).
 * A single mentor legitimately holding both an institute AND industry seat is
 * untouched — this dedupes within a mentorType, not across types.
 */
export function dedupeMentorAssignmentsByType<T extends TimestampedAssignment>(assignments: T[]): T[] {
  const sorted = [...assignments].sort(
    (a, b) => b.assignedAt.getTime() - a.assignedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const seen = new Set<T['mentorType']>();
  const result: T[] = [];
  for (const a of sorted) {
    if (seen.has(a.mentorType)) continue;
    seen.add(a.mentorType);
    result.push(a);
  }
  return result;
}

type FreezeActor = { id: string; platformRole: PlatformRole; additionalRoles?: PlatformRole[] | null };

/**
 * Freezing a team is limited to admins and the team's own ACTIVE faculty (institute) mentor.
 * A dual-role user who is only the team's industry mentor must not pass, nor may a faculty
 * mentor of a different team.
 */
export function canFreezeTeam(user: FreezeActor, assignments: AssignmentLike[]): boolean {
  if (hasRole(user, PlatformRole.admin)) return true;
  return assignments.some(
    (a) => a.active && a.mentorType === MentorType.institute && a.mentorUserId === user.id,
  );
}

/** Case-insensitive, whitespace-tolerant email comparison for invitedEmail matching. */
export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * `team.mentorLockedAt` mirrors "an active institute assignment exists": keep the original timestamp
 * while a faculty seat is held, set it when one is first seated, and clear it once none remains.
 */
export function nextMentorLockedAt(hasActiveFaculty: boolean, current: Date | null, now: Date): Date | null {
  if (!hasActiveFaculty) return null;
  return current ?? now;
}
