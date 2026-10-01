import { MentorType, PlatformRole } from '@prisma/client';

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
