import { HttpException, HttpStatus } from '@nestjs/common';
import { getCacheRedis } from './queue';

export async function consumeToken(key: string, limitPerMin: number) {
  try {
    const redis = getCacheRedis();
    const bucket = `rl:${key}:${Math.floor(Date.now() / 60000)}`;
    // Single RTT: incr + expire together (expire is a no-op after first set via TTL refresh).
    const results = await redis.multi().incr(bucket).expire(bucket, 70).exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    if (count > limitPerMin) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  } catch (err) {
    if (err instanceof HttpException) throw err;
    console.warn('[rate-limit] Redis unavailable; allowing request', err);
  }
}

function otpEmailHourlyLimit() {
  return Number(process.env.OTP_RATE_LIMIT_EMAIL_HOURLY ?? 3);
}

function otpIpHourlyLimit() {
  return Number(process.env.OTP_RATE_LIMIT_IP_HOURLY ?? 20);
}

function otpResendCooldownSec() {
  return Number(process.env.OTP_RESEND_COOLDOWN_SEC ?? 60);
}

/** Best-effort client IP behind Azure App Service / proxies. */
export function getClientIp(req: unknown): string {
  const headers = (req as { headers?: Record<string, unknown> })?.headers;
  const fwd = headers?.['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : String(fwd ?? '')).split(',')[0].trim();
  if (first) return normalizeIp(first);
  const direct =
    (req as { ip?: unknown })?.ip ??
    (req as { connection?: { remoteAddress?: unknown } })?.connection?.remoteAddress;
  return normalizeIp(String(direct ?? 'unknown'));
}

/**
 * Node/Azure fallbacks sometimes yield `IP:port` (e.g. `165.99.8.22:63638`).
 * Strip the port for IPv4 so IP buckets stay stable. IPv6 left untouched.
 */
function normalizeIp(value: string): string {
  const trimmed = value.trim();
  const ipv4Port = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4Port) return ipv4Port[1];
  return trimmed.slice(0, 64) || 'unknown';
}

/**
 * Combined hourly quota across ALL OTP dispatch endpoints (otp/send, register,
 * password/forgot). A single shared `otp-hr:email` bucket means an attacker
 * cannot get 3 of each type against the same victim. Fail-CLOSED: Redis errors
 * surface as 503 so a Redis outage cannot be exploited to burn Resend quota.
 */
export async function consumeOtpDispatchQuota(opts: { email: string; ip: string }) {
  const email = opts.email.trim().toLowerCase();
  const ip = (opts.ip || 'unknown').trim().slice(0, 64) || 'unknown';
  const hour = Math.floor(Date.now() / 3_600_000);
  const emailBucket = `otp-hr:email:${email}:${hour}`;
  const ipBucket = `otp-hr:ip:${ip}:${hour}`;
  let emailResults: Array<[unknown, unknown]> | null;
  let ipResults: Array<[unknown, unknown]> | null;
  try {
    const redis = getCacheRedis();
    // NOTE: two single-key MULTIs, not one two-key MULTI. Azure Managed Redis
    // runs in cluster mode, where a MULTI spanning keys on different hash slots
    // is rejected with CROSSSLOT (EXECABORT). One key per MULTI is always safe.
    [emailResults, ipResults] = (await Promise.all([
      redis.multi().incr(emailBucket).expire(emailBucket, 3700).exec(),
      redis.multi().incr(ipBucket).expire(ipBucket, 3700).exec(),
    ])) as [Array<[unknown, unknown]> | null, Array<[unknown, unknown]> | null];
  } catch (err) {
    console.error('[rate-limit] Redis unavailable; failing closed for OTP dispatch', err);
    throw new HttpException(
      'Verification is temporarily unavailable. Try again shortly.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  const emailCount = Number(emailResults?.[0]?.[1] ?? 0);
  const ipCount = Number(ipResults?.[0]?.[1] ?? 0);
  if (emailCount > otpEmailHourlyLimit()) {
    throw new HttpException(
      'Too many verification emails sent to this address. Try again in an hour.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (ipCount > otpIpHourlyLimit()) {
    throw new HttpException(
      'Too many verification requests from this network. Try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function otpCooldownKey(email: string, purpose: string) {
  return `otp:cooldown:${purpose}:${email.trim().toLowerCase()}`;
}

/** Rejects immediate re-sends (double-clicks, retry loops). Fail-closed like the quota. */
export async function checkOtpCooldown(email: string, purpose: string) {
  try {
    const exists = await getCacheRedis().get(otpCooldownKey(email, purpose));
    if (exists) {
      throw new HttpException(
        'A code was just sent. Wait a minute before requesting another.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  } catch (err) {
    if (err instanceof HttpException) throw err;
    console.error('[rate-limit] Redis unavailable; failing closed for OTP cooldown check', err);
    throw new HttpException(
      'Verification is temporarily unavailable. Try again shortly.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export async function markOtpCooldown(email: string, purpose: string) {
  try {
    await getCacheRedis().set(otpCooldownKey(email, purpose), '1', 'EX', otpResendCooldownSec());
  } catch (err) {
    console.error('[rate-limit] Failed to set OTP cooldown; continuing', err);
  }
}

/**
 * Refunds one unit of hourly OTP quota. Call when a dispatch was counted but no
 * email actually went out (Resend rejection, Redis write failure, validation
 * error after counting). Best-effort and fail-open: if the refund itself fails,
 * the user keeps the burned unit rather than us throwing a second error.
 * Single-key DECRs so this stays safe on cluster-mode Redis.
 */
export async function refundOtpDispatchQuota(opts: { email: string; ip: string }) {
  const email = opts.email.trim().toLowerCase();
  const ip = (opts.ip || 'unknown').trim().slice(0, 64) || 'unknown';
  const hour = Math.floor(Date.now() / 3_600_000);
  try {
    const redis = getCacheRedis();
    await Promise.all([
      redis.decr(`otp-hr:email:${email}:${hour}`),
      redis.decr(`otp-hr:ip:${ip}:${hour}`),
    ]);
  } catch (err) {
    console.warn('[rate-limit] Failed to refund OTP quota; continuing', err);
  }
}
