export type ScanStatus = 'pending' | 'clean' | 'skipped' | 'failed';

export async function requestVirusScan(objectKey: string): Promise<ScanStatus> {
  const url = process.env.SCAN_WEBHOOK_URL;
  if (!url) return 'skipped';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-scan-secret': process.env.SCAN_WEBHOOK_SECRET ?? '' },
      body: JSON.stringify({
        bucket: process.env.S3_BUCKET,
        key: objectKey,
      }),
    });
    if (!res.ok) return 'failed';
    return 'pending';
  } catch {
    return 'failed';
  }
}

export function isS3Configured() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}