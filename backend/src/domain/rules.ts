export function isPsCapReached(selectedCount: number, teamCap: number | null | undefined): boolean {
  return teamCap != null && selectedCount >= teamCap;
}

export function canStudentViewResults(published: boolean): boolean {
  return published === true;
}

export function nextVersion(previous: number | null | undefined): number {
  return (previous ?? 0) + 1;
}

export function pickLeastLoadedMentor<T extends { id: string; domainTags: string[] }>(
  mentors: T[],
  load: Map<string, number>,
  theme?: string | null,
): T | null {
  if (!mentors.length) return null;
  const tagged = theme ? mentors.filter((m) => m.domainTags.includes(theme)) : [];
  const pool = tagged.length ? tagged : mentors;
  return [...pool].sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))[0] ?? null;
}

export const DEFAULT_SETTINGS = {
  member_cap: 6,
  institute_mentor_cap: 1,
  industry_mentor_cap: 1,
  invite_ttl_hours: 72,
  draft_hold_hours: 48,
};