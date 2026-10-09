import { getCacheRedis } from './queue';

export const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
export const DEFAULT_WINDOW_MINUTES = 15;
export const DEFAULT_BLOCK_DURATION_HOURS = 24;
export const DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK = 3;

/**
 * Redis key patterns:
 * - `login:fail:{ip}:{window_index}` - counter for failed attempts in a window
 * - `login:block:{ip}` - stores the block expiry timestamp (in seconds since epoch)
 * - `login:lockout_count:{ip}` - number of times this IP reached max failed attempts across windows
 */

export interface IpRateLimitState {
  attempts: number;
  blocked: boolean;
  blockedUntil?: number; // timestamp in seconds when block expires
  windowIndex: number;
}

/**
 * Check if an IP is currently blocked.
 * Returns whether blocked and the remaining time until unblock.
 */
export async function checkIpBlocked(ip: string): Promise<{ blocked: boolean; retryAfter?: number }> {
  const normalizedIp = ip.trim();
  if (!normalizedIp) return { blocked: false };

  try {
    const redis = getCacheRedis();
    const now = Math.floor(Date.now() / 1000);
    const blockKey = `login:block:${normalizedIp}`;

    const blockExpiry = await redis.get(blockKey);

    if (blockExpiry && Number(blockExpiry) > now) {
      const retryAfter = Number(blockExpiry) - now;
      return {
        blocked: true,
        retryAfter,
      };
    }

    // Clean up expired block
    if (blockExpiry) {
      await redis.del(blockKey);
    }

    return { blocked: false };
  } catch (err) {
    console.warn('[login-rate-limit] Redis unavailable in checkIpBlocked; failing open', err);
    return { blocked: false };
  }
}

/**
 * Track a failed login attempt for a given IP.
 * Returns the current state: attempts count, whether blocked, and block expiry.
 */
export async function trackFailedLogin(ip: string): Promise<IpRateLimitState> {
  const normalizedIp = ip.trim();
  const maxAttempts = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS ?? DEFAULT_MAX_FAILED_ATTEMPTS);
  const windowMinutes = Number(process.env.LOGIN_WINDOW_MINUTES ?? DEFAULT_WINDOW_MINUTES);
  const now = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(now / (windowMinutes * 60));

  if (!normalizedIp) {
    return { attempts: 1, blocked: false, windowIndex };
  }

  try {
    const redis = getCacheRedis();
    const key = `login:fail:${normalizedIp}:${windowIndex}`;
    const blockKey = `login:block:${normalizedIp}`;

    // Atomically increment failed counter and check existing block
    const results = await redis.multi()
      .incr(key)
      .expire(key, windowMinutes * 60)
      .get(blockKey)
      .exec();

    const count = Number(results?.[0]?.[1] ?? 1);
    const blockExpiry = results?.[2]?.[1] ? Number(results[2][1]) : undefined;

    const isCurrentlyBlocked = Boolean(blockExpiry && blockExpiry > now);
    const blocked = isCurrentlyBlocked || count >= maxAttempts;

    return {
      attempts: count,
      blocked,
      blockedUntil: isCurrentlyBlocked ? blockExpiry : undefined,
      windowIndex,
    };
  } catch (err) {
    console.warn('[login-rate-limit] Redis unavailable in trackFailedLogin; allowing fallback', err);
    return { attempts: 1, blocked: false, windowIndex };
  }
}

/**
 * Auto-block an IP if it has exceeded the max lockout threshold.
 * Should be called when an IP reaches the maximum allowed failed attempts in a window.
 */
export async function autoBlockIpIfNeeded(ip: string, attemptsInWindow: number): Promise<{
  newlyBlocked: boolean;
  blockDurationHours: number;
  blockExpiry?: number;
}> {
  const normalizedIp = ip.trim();
  const maxAttempts = Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS ?? DEFAULT_MAX_FAILED_ATTEMPTS);
  const maxLockouts = Number(process.env.LOGIN_MAX_LOCKOUTS_BEFORE_BLOCK ?? DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK);
  const blockDurationHours = Number(process.env.LOGIN_BLOCK_DURATION_HOURS ?? DEFAULT_BLOCK_DURATION_HOURS);
  const windowMinutes = Number(process.env.LOGIN_WINDOW_MINUTES ?? DEFAULT_WINDOW_MINUTES);

  if (!normalizedIp || attemptsInWindow < maxAttempts) {
    return {
      newlyBlocked: false,
      blockDurationHours,
    };
  }

  try {
    const redis = getCacheRedis();
    const now = Math.floor(Date.now() / 1000);
    const blockKey = `login:block:${normalizedIp}`;
    const lockoutKey = `login:lockout_count:${normalizedIp}`;

    // Increment lockout count
    const lockoutCount = await redis.incr(lockoutKey);
    // Keep lockout count across windows (default 24 hours) so persistent attackers are caught
    await redis.expire(lockoutKey, 24 * 60 * 60);

    if (lockoutCount >= maxLockouts) {
      // Auto-block the IP for the block duration
      const blockUntil = now + (blockDurationHours * 60 * 60);
      await redis.set(blockKey, String(blockUntil), 'EX', blockDurationHours * 60 * 60);
      await redis.del(lockoutKey);

      return {
        newlyBlocked: true,
        blockDurationHours,
        blockExpiry: blockUntil,
      };
    }

    return {
      newlyBlocked: false,
      blockDurationHours,
    };
  } catch (err) {
    console.warn('[login-rate-limit] Redis unavailable in autoBlockIpIfNeeded', err);
    return {
      newlyBlocked: false,
      blockDurationHours,
    };
  }
}

/**
 * Clear failed login attempts in the current window for an IP upon successful login.
 * Note: Does NOT remove active blocks if an IP is already under security block.
 */
export async function clearFailedAttempts(ip: string): Promise<void> {
  const normalizedIp = ip.trim();
  if (!normalizedIp) return;

  try {
    const redis = getCacheRedis();
    const windowMinutes = Number(process.env.LOGIN_WINDOW_MINUTES ?? DEFAULT_WINDOW_MINUTES);
    const now = Math.floor(Date.now() / 1000);
    const windowIndex = Math.floor(now / (windowMinutes * 60));
    const key = `login:fail:${normalizedIp}:${windowIndex}`;

    await redis.del(key);
  } catch (err) {
    console.warn('[login-rate-limit] Redis unavailable in clearFailedAttempts', err);
  }
}