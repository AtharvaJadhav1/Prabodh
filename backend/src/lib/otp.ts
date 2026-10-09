import { createHash, randomBytes, randomInt } from 'crypto';
import { getCacheRedis } from './queue';
import { resolveOtpFromAddress, sendTransactionalEmail } from './resend';
import { renderOtpEmail } from '../modules/notifications/templates/render';

const OTP_TTL_SEC = Number(process.env.OTP_TTL_SEC ?? 600);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

export type OtpPurpose = 'login' | 'register' | 'reset_password';

export type PendingRegistration = {
  email: string;
  fullName: string;
  password: string;
  platformRole: 'student' | 'institute_mentor' | 'industry_mentor';
  institute?: string;
  department?: string;
  phone?: string;
};

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function otpKey(purpose: OtpPurpose, email: string) {
  return `otp:${purpose}:${email.toLowerCase()}`;
}

function profileKey(email: string) {
  return `otp:register:profile:${email.toLowerCase()}`;
}

function generateCode() {
  return String(randomInt(100000, 999999));
}

export async function sendOtp(opts: {
  email: string;
  purpose: OtpPurpose;
  profile?: PendingRegistration;
}): Promise<{ devCode?: string }> {
  const email = opts.email.trim().toLowerCase();
  const code = generateCode();
  const redis = getCacheRedis();
  const key = otpKey(opts.purpose, email);

  try {
    await redis.set(
      key,
      JSON.stringify({ hash: hashCode(code), attempts: 0 }),
      'EX',
      OTP_TTL_SEC,
    );
    if (opts.purpose === 'register' && opts.profile) {
      await redis.set(profileKey(email), JSON.stringify(opts.profile), 'EX', OTP_TTL_SEC);
    }
  } catch (err) {
    console.error('[otp] Redis write failed during send', err);
    await clearStoredOtp(redis, key, opts.purpose, email);
    throw new Error(
      `OTP storage unavailable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const minutes = Math.floor(OTP_TTL_SEC / 60);
  const title =
    opts.purpose === 'register'
      ? 'Verify your registration'
      : opts.purpose === 'reset_password'
        ? 'Reset your password'
        : 'Your sign-in code';

  const subject =
    opts.purpose === 'register'
      ? 'Verify your Prabodh registration'
      : opts.purpose === 'reset_password'
        ? 'Reset your Prabodh password'
        : 'Your Prabodh sign-in code';

  const lead =
    opts.purpose === 'register'
      ? 'Thank you for registering on Prabodh. Use the one-time verification code below to activate your account.'
      : opts.purpose === 'reset_password'
        ? 'Use the one-time verification code below to choose a new password for your Prabodh account.'
        : 'Use the one-time verification code below to sign in to your Prabodh account.';

  const html = renderOtpEmail({
    title,
    lead,
    code,
    expiresMinutes: minutes,
  });

  try {
    await sendTransactionalEmail({
      to: email,
      subject,
      html,
      from: resolveOtpFromAddress(),
    });
    return {};
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[otp] Email send failed — dev code logged', err);
      return { devCode: code };
    }
    // Production: no live OTP / plaintext password may linger when delivery failed.
    await clearStoredOtp(redis, key, opts.purpose, email);
    const msg = err instanceof Error ? err.message : 'Email send failed';
    console.error('[otp] Email send failed in production', msg);
    throw new Error(msg);
  }
}

async function clearStoredOtp(
  redis: ReturnType<typeof getCacheRedis>,
  key: string,
  purpose: OtpPurpose,
  email: string,
) {
  try {
    await redis.del(key);
    if (purpose === 'register') await redis.del(profileKey(email));
  } catch {
    /* best-effort cleanup */
  }
}

export async function verifyOtp(opts: {
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: true; profile?: PendingRegistration } | { ok: false; reason: string }> {
  const email = opts.email.trim().toLowerCase();
  const redis = getCacheRedis();
  const key = otpKey(opts.purpose, email);
  let raw: string | null;
  try {
    raw = await redis.get(key);
  } catch (err) {
    console.error('[otp] Redis read failed during verify', err);
    return { ok: false, reason: 'Verification is temporarily unavailable. Try again in a moment.' };
  }

  if (!raw) return { ok: false, reason: 'Code expired or not requested. Request a new code.' };

  const stored = JSON.parse(raw) as { hash: string; attempts: number };
  if (stored.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    return { ok: false, reason: 'Too many attempts. Request a new code.' };
  }

  const match = hashCode(opts.code.trim()) === stored.hash;
  if (!match) {
    stored.attempts += 1;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.set(key, JSON.stringify(stored), 'EX', ttl);
    }
    return { ok: false, reason: 'Invalid code. Try again.' };
  }

  await redis.del(key);

  if (opts.purpose === 'register') {
    const profileRaw = await redis.get(profileKey(email));
    await redis.del(profileKey(email));
    if (!profileRaw) {
      return { ok: false, reason: 'Registration session expired. Start again.' };
    }
    return { ok: true, profile: JSON.parse(profileRaw) as PendingRegistration };
  }

  return { ok: true };
}

const RESET_TOKEN_TTL_SEC = Number(process.env.RESET_TOKEN_TTL_SEC ?? 600);

function resetTokenKey(email: string) {
  return `otp:reset_token:${email.trim().toLowerCase()}`;
}

/** Issued only after the reset code has been verified; required to set the new password. */
export async function issueResetToken(email: string): Promise<string> {
  const token = randomBytes(24).toString('hex');
  await getCacheRedis().set(resetTokenKey(email), hashCode(token), 'EX', RESET_TOKEN_TTL_SEC);
  return token;
}

/** One-time: the token is deleted whether or not it matches, so it cannot be brute-forced. */
export async function consumeResetToken(email: string, token: string): Promise<boolean> {
  const redis = getCacheRedis();
  const key = resetTokenKey(email);
  const stored = await redis.get(key);
  if (!stored) return false;
  const ok = stored === hashCode(token);
  if (ok) await redis.del(key);
  return ok;
}
