import { HttpException, HttpStatus } from '@nestjs/common';
import { getCacheRedis } from './queue';

export async function consumeToken(key: string, limitPerMin: number) {
  const normalizedKey = key.trim();
  if (!normalizedKey || limitPerMin <= 0) return;

  try {
    const redis = getCacheRedis();
    const bucket = `rl:${normalizedKey}:${Math.floor(Date.now() / 60000)}`;
    // Single RTT: incr + expire together (expire is a no-op after first set via TTL refresh).
    const results = await redis.multi().incr(bucket).expire(bucket, 70).exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    if (count > limitPerMin) {
      throw new HttpException('Too many requests. Please wait a minute and try again.', HttpStatus.TOO_MANY_REQUESTS);
    }
  } catch (err) {
    if (err instanceof HttpException) throw err;
    console.warn('[rate-limit] Redis unavailable; allowing request', err);
  }
}

// Cooldown between OTP dispatches, plus a hard cap on sends per window.
// Defaults: 303s (5 min + 3s) so the backend forbids a resend slightly longer
// than the 300s frontend countdown, closing the enable-vs-unlock race.
const OTP_RESEND_COOLDOWN_SEC = Number(process.env.OTP_RESEND_COOLDOWN_SEC ?? 303);
const OTP_MAX_SENDS = Number(process.env.OTP_MAX_SENDS ?? 3);
const OTP_RESEND_WINDOW_SEC = Number(process.env.OTP_RESEND_WINDOW_SEC ?? 900);

/**
 * Enforce a per-email OTP resend cooldown and a per-window send cap.
 * `scope` namespaces flows (e.g. `pwd-forgot`, `otp-send:login`) so they never
 * block one another. Throws 429 (with an explicit message) when throttled.
 */
export async function enforceOtpResendCooldown(scope: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  try {
    const redis = getCacheRedis();
    const lockKey = `otp-lock:${scope}:${normalized}`;
    if (await redis.get(lockKey)) {
      throw new HttpException('Too many requests. Please try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // NX set succeeds only when no cooldown is currently active.
    const cooldownKey = `otp-cd:${scope}:${normalized}`;
    const acquired = await redis.set(cooldownKey, '1', 'EX', OTP_RESEND_COOLDOWN_SEC, 'NX');
    if (acquired !== 'OK') {
      const minutes = Math.max(1, Math.round(OTP_RESEND_COOLDOWN_SEC / 60));
      throw new HttpException(
        `Please wait ${minutes} minutes before requesting a new verification code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Backstop: lock the email once the send ceiling is hit inside the window.
    const windowKey = `otp-win:${scope}:${normalized}`;
    const count = await redis.incr(windowKey);
    if (count === 1) await redis.expire(windowKey, OTP_RESEND_WINDOW_SEC);
    if (count > OTP_MAX_SENDS) {
      await redis.set(lockKey, '1', 'EX', OTP_RESEND_WINDOW_SEC);
      throw new HttpException('Too many requests. Please try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }
  } catch (err) {
    if (err instanceof HttpException) throw err;
    console.warn('[otp-cooldown] Redis unavailable; allowing request', err);
  }
}
