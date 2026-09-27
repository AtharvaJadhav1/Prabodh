/**
 * Tiny process-local TTL cache for hot, rarely-changing reads.
 * Not a substitute for Redis — just cuts repeated identical Prisma work
 * under concurrent Artillery/browser traffic on a single Node instance.
 */
type Entry<T> = { value: T; expiresAt: number };

export class TtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Drop every key that starts with prefix (e.g. invalidate a family of list caches). */
  deletePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
