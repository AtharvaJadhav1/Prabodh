/**
 * Pure team rules, kept free of Prisma/Nest imports so they can be unit tested directly.
 */

/**
 * A disqualified team is permanently frozen. Every mutation is refused regardless of role —
 * the rule is deliberately not a function of the caller, so a stronger role cannot bypass it.
 */
export function isTeamFrozen(status: string | null | undefined): boolean {
  return status === 'disqualified';
}

export const TEAM_FROZEN_MESSAGE =
  'This team has been disqualified and can no longer be modified.';