import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function s3() {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

export const ALLOWED_UPLOAD_MIME = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/png',
  'image/jpeg',
]);

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export function normalizeUploadMime(filename: string, contentType?: string) {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  const fromExt = MIME_BY_EXT[ext];
  if (fromExt) return fromExt;
  if (contentType && ALLOWED_UPLOAD_MIME.has(contentType)) return contentType;
  return contentType || 'application/octet-stream';
}

function publicObjectUrl(key: string) {
  const base = (process.env.S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  const endpoint = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
  const bucket = process.env.S3_BUCKET;
  if (endpoint && bucket) return `${endpoint}/${bucket}/${key}`;
  return key;
}

export async function createPresignedPutUrl(key: string, contentType: string, contentLength: number) {
  if (!ALLOWED_UPLOAD_MIME.has(contentType)) {
    throw new Error(`Unsupported file type: ${contentType}`);
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    throw new Error('File exceeds 200MB limit');
  }
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is not set');
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // Do not sign ContentLength — browsers/XHR can mismatch and cause 403 on PUT.
  });
  const url = await getSignedUrl(s3(), command, { expiresIn: 900 });
  return { url, key, publicUrl: publicObjectUrl(key) };
}

export async function createPresignedGetUrl(key: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is not set');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3(), command, { expiresIn: 3600 });
}

export async function putObjectBuffer(key: string, body: Buffer, contentType: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is not set');
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, publicUrl: publicObjectUrl(key) };
}

export function isS3Configured() {
  return Boolean(process.env.S3_BUCKET);
}
