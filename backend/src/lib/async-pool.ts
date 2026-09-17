/** Run async tasks with a fixed concurrency limit (keeps bulk pipelines responsive). */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()));
  return results;
}

/** Fire work without blocking the HTTP response; errors are logged. */
export function fireAndForget(label: string, work: () => Promise<unknown>) {
  void work().catch((err) => {
    console.error(`[bg] ${label}`, err instanceof Error ? err.message : err);
  });
}
