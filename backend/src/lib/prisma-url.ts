/**
 * Ensure Prisma's connection pool is capped for small hosts (Render / single VM).
 * Unbounded pools under concurrent load exhaust Postgres and spike latency.
 */
export function prismaDatasourceUrl(raw = process.env.DATABASE_URL ?? ''): string {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) {
      const limit = process.env.PRISMA_CONNECTION_LIMIT ?? '10';
      url.searchParams.set('connection_limit', limit);
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT ?? '10');
    }
    return url.toString();
  } catch {
    // Non-URL connection strings (e.g. Prisma Accelerate) — leave untouched.
    return raw;
  }
}
