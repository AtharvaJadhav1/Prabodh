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

export async function createPresignedPutUrl(key: string, contentType: string, contentLength: number) {
  if (!ALLOWED_UPLOAD_MIME.has(contentType)) {
    throw new Error('Unsupported file type');
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
    ContentLength: contentLength,
  });
  const url = await getSignedUrl(s3(), command, { expiresIn: 900 });
  return { url, key };
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
  return key;
}
