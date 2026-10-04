import { TtlCache } from './ttl-cache';

/**
 * The PS list payload embeds `teamsSelectedCount`, so any code path that moves that counter
 * has to drop the cache. It lives here rather than in the problem-statements module because
 * team disqualification also moves those counters, and importing the service from there
 * would form a cycle (that service already depends on TeamsService).
 */
export const psListCache = new TtlCache<{ items: unknown; total: number; page: number; limit: number; pages: number }>(15_000);

export function clearPsListCache() {
  psListCache.clear();
}