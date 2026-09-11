import { createClerkClient, verifyToken } from '@clerk/backend';

export function getClerkClient() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  return createClerkClient({ secretKey: key });
}

export async function verifyClerkSession(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not set');
  }
  return verifyToken(token, { secretKey });
}

export type ClerkRole = 'student' | 'institute_mentor' | 'industry_mentor' | 'admin';

export function roleFromClaims(payload: Record<string, unknown>): ClerkRole {
  const meta = (payload.publicMetadata ?? payload.public_metadata ?? {}) as Record<string, unknown>;
  const sessionMeta = (payload.metadata ?? {}) as Record<string, unknown>;
  const role = String(meta.role ?? sessionMeta.role ?? 'student');
  if (
    role === 'admin' ||
    role === 'institute_mentor' ||
    role === 'industry_mentor' ||
    role === 'student'
  ) {
    return role;
  }
  return 'student';
}
