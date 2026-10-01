import { PlatformRole } from '@prisma/client';

export const MENTOR_ROLES: PlatformRole[] = [
  PlatformRole.institute_mentor,
  PlatformRole.industry_mentor,
];

type RoleCarrier = {
  platformRole: PlatformRole;
  additionalRoles?: PlatformRole[] | null;
};

/** Every role an account holds — primary first, extras deduplicated. */
export function allRoles(user: RoleCarrier): PlatformRole[] {
  const extras = Array.isArray(user.additionalRoles) ? user.additionalRoles : [];
  return [user.platformRole, ...extras.filter((r) => r !== user.platformRole)];
}

export function hasRole(user: RoleCarrier, role: PlatformRole): boolean {
  return allRoles(user).includes(role);
}

export function hasAnyRole(user: RoleCarrier, roles: PlatformRole[]): boolean {
  const held = allRoles(user);
  return roles.some((r) => held.includes(r));
}

/** True dual-mentor account: holds both institute_mentor and industry_mentor. */
export function isDualMentor(user: RoleCarrier): boolean {
  return hasRole(user, PlatformRole.institute_mentor) && hasRole(user, PlatformRole.industry_mentor);
}

/** Merge a newly granted role into extras (never duplicates the primary). */
export function unionAdditionalRoles(
  current: RoleCarrier,
  granted: PlatformRole,
): PlatformRole[] {
  if (granted === current.platformRole) {
    return Array.isArray(current.additionalRoles) ? [...current.additionalRoles] : [];
  }
  const extras = Array.isArray(current.additionalRoles) ? current.additionalRoles : [];
  return extras.includes(granted) ? [...extras] : [...extras, granted];
}
