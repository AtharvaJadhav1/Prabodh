import { createHash, randomInt } from 'crypto';
import { getRedis } from './queue';
import { resolveOtpFromAddress, sendTransactionalEmail } from './resend';

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
  const redis = getRedis();
  const key = otpKey(opts.purpose, email);

  await redis.set(
    key,
    JSON.stringify({ hash: hashCode(code), attempts: 0 }),
    'EX',
    OTP_TTL_SEC,
  );

  if (opts.purpose === 'register' && opts.profile) {
    await redis.set(profileKey(email), JSON.stringify(opts.profile), 'EX', OTP_TTL_SEC);
  }

  const minutes = Math.floor(OTP_TTL_SEC / 60);
  const subject =
    opts.purpose === 'register'
      ? 'Verify your Prabodh registration'
      : opts.purpose === 'reset_password'
        ? 'Reset your Prabodh password'
        : 'Your Prabodh sign-in code';

  const bodyCopy =
    opts.purpose === 'register'
      ? `
      <p>Hi there,</p>
      <p>Thank you for registering.</p>
      <p>Use the one-time verification code (OTP) below to activate your account:</p>
      `
      : opts.purpose === 'reset_password'
        ? `
      <p>Hi there,</p>
      <p>Use the one-time verification code (OTP) below to choose a new password:</p>
      `
        : `
      <p>Hi there,</p>
      <p>Use the one-time verification code (OTP) below to sign in:</p>
      `;

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
      <h2 style="color:#5B2E10;margin:0 0 16px">Prabodh</h2>
      ${bodyCopy}
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#D96B27;margin:20px 0">${code}</p>
      <p style="color:#666;margin:0 0 8px">This code expires in ${minutes} minutes. If you did not request this, you can safely ignore this email.</p>
      <p style="color:#666;margin:16px 0 0">— Prabodh Support Team</p>
    </div>
  `;

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
    throw err;
  }
}

export async function verifyOtp(opts: {
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<{ ok: true; profile?: PendingRegistration } | { ok: false; reason: string }> {
  const email = opts.email.trim().toLowerCase();
  const redis = getRedis();
  const key = otpKey(opts.purpose, email);
  const raw = await redis.get(key);

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
