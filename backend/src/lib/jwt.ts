import { createHmac, timingSafeEqual } from 'crypto';
import { PlatformRole } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: PlatformRole;
  iat: number;
  exp: number;
};

function secret() {
  const key =
    process.env.AUTH_JWT_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    'dev-only-change-me';
  if (process.env.NODE_ENV === 'production' && key === 'dev-only-change-me') {
    throw new Error('AUTH_JWT_SECRET must be set in production');
  }
  return key;
}

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function signAccessToken(user: { id: string; email: string; platformRole: PlatformRole }) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = Number(process.env.AUTH_JWT_TTL_SEC ?? 60 * 60 * 24 * 7);
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.platformRole,
    iat: now,
    exp: now + ttlSec,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', secret()).update(`${header}.${body}`).digest();
  const actual = Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(b64urlDecode(body)) as AccessTokenPayload;
  if (!payload.sub || !payload.exp) throw new Error('Invalid token payload');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}
