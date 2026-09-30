import { createPresignedGetUrl, isS3Configured } from './s3';

/** Extract S3 object key from a stored ppt/report URL or raw key path. */
export function objectKeyFromStoredUrl(stored: string): string | null {
  if (!stored || stored.startsWith('data:')) return null;
  if (!stored.startsWith('http')) return stored.replace(/^\//, '');

  const base = (process.env.S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base && stored.startsWith(`${base}/`)) {
    return stored.slice(base.length + 1);
  }

  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    const marker = `/${bucket}/`;
    const idx = stored.indexOf(marker);
    if (idx >= 0) return stored.slice(idx + marker.length);
  }

  try {
    const u = new URL(stored);
    const parts = u.pathname.split('/').filter(Boolean);
    if (bucket && parts[0] === bucket) return parts.slice(1).join('/');
    if (parts[0] === 'deliverables') return parts.join('/');
  } catch {
    /* not a URL */
  }
  return null;
}

export async function resolveDeliverableMediaUrl(stored: string | null | undefined) {
  if (!stored) return stored ?? null;
  if (stored.startsWith('data:')) return stored;
  if (!isS3Configured()) return stored;
  if (process.env.S3_PUBLIC_BASE_URL) return stored;

  const key = objectKeyFromStoredUrl(stored);
  if (!key) return stored;
  try {
    return await createPresignedGetUrl(key);
  } catch {
    return stored;
  }
}

export async function resolveDeliverableRow<
  T extends { pptUrl?: string | null; reportUrl?: string | null; videoUrl?: string | null },
>(row: T): Promise<T> {
  const [pptUrl, reportUrl, videoUrl] = await Promise.all([
    resolveDeliverableMediaUrl(row.pptUrl),
    resolveDeliverableMediaUrl(row.reportUrl),
    resolveDeliverableMediaUrl(row.videoUrl),
  ]);
  return { ...row, pptUrl, reportUrl, videoUrl };
}
