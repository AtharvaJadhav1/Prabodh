export const API_CACHE_TTL_MS = 60_000;

type CacheEntry = { data: unknown; storedAt: number };

const PREFIX = "sih-api-cache-v1:";
const memory = new Map<string, CacheEntry>();

const neverCachePaths = [/^\/me($|\?)/, /^\/auth\//, /^\/health/];

export function cacheKey(userId: string | undefined, method: string, path: string): string {
  const clean = path.split("?")[0];
  return `${userId ?? "anon"}|${method} ${clean}`;
}

export function shouldCache(method: string, path: string): boolean {
  if (method !== "GET") return false;
  return !neverCachePaths.some((re) => re.test(path));
}

export function getCached<T>(key: string): { data: T; storedAt: number } | undefined {
  const hit = memory.get(key);
  if (hit) return hit as { data: T; storedAt: number };
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { data: T; storedAt: number };
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

export function setCached(key: string, data: unknown, storedAt = Date.now()) {
  const entry: CacheEntry = { data, storedAt };
  memory.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage quota exceeded — memory-only cache is fine */
  }
}

export function isFresh(entry: { storedAt: number }, now: number = Date.now()): boolean {
  return now - entry.storedAt < API_CACHE_TTL_MS;
}

export function clearApiCache() {
  memory.clear();
  if (typeof window === "undefined") return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* no-op */
  }
}