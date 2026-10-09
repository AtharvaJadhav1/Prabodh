import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { getCacheRedis } from './queue';

const DEFAULT_MAX_FAILED_ATTEMPTS = 3;
const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_BLOCK_DURATION_HOURS = 24;
const DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK = 3;

/**
 * Redis key patterns:
 * - `login:fail:{ip}:{window_index}` - incremented counter for failed attempts in a window
 * - `login:block:{ip}` - stores the block expiry timestamp (in seconds since epoch)
 * - `login:success:{ip}` - timestamp of last successful login (used to clear failed attempts)
 */

interface IpRateLimitState {
  attempts: number;
  blocked: boolean;
  blockedUntil?: number; // timestamp in seconds when block expires
  windowIndex: number;
}

/**
 * Track a failed login attempt for a given IP.
 * Returns the current state: attempts count, whether blocked, and block expiry.
 */
export async function trackFailedLogin(ip: string): Promise<IpRateLimitState> {
  const redis = getCacheRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(now / (DEFAULT_WINDOW_MINUTES * 60));
  const key = `login:fail:${ip}:${windowIndex}`;
  const blockKey = `login:block:${ip}`;

  // Increment the failed attempt counter
  const results = await redis.multi()
    .incr(key)
    .expire(key, DEFAULT_WINDOW_MINUTES * 60)
    .get(blockKey)
    .exec();

  const count = Number(results?.[0]?.[1] ?? 0);
  const blockExpiry = results?.[1]?.[1] 
    ? Number(results?.[1]?.[1]) 
    : undefined;

  // Check if IP is already blocked from a previous auto-block
  let isCurrentlyBlocked = false;
  if (blockExpiry && blockExpiry > now) {
    isCurrentlyBlocked = true;
  }

  const blocked = isCurrentlyBlocked || count > DEFAULT_MAX_FAILED_ATTEMPTS;

  return {
    attempts: blocked ? DEFAULT_MAX_FAILED_ATTEMPTS : count,
    blocked,
    blockedUntil: blocked ? blockExpiry : undefined,
    windowIndex,
  };
}

/**
 * Check if an IP is currently blocked.
 * Returns whether blocked and the remaining time until unblock.
 */
export async function checkIpBlocked(ip: string): Promise<{ blocked: boolean; retryAfter?: number }> {
  const redis = getCacheRedis();
  const now = Math.floor(Date.now() / 1000);
  const blockKey = `login:block:${ip}`;

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
}

/**
 * Clear failed login attempts for an IP (called on successful login).
 */
export async function clearFailedAttempts(ip: string): Promise<void> {
  const redis = getCacheRedis();
  const now = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(now / (DEFAULT_WINDOW_MINUTES * 60));
  const key = `login:fail:${ip}:${windowIndex}`;

  await redis.del(key);

  // Also clear any block if it exists (successful login unblocks)
  const blockKey = `login:block:${ip}`;
  await redis.del(blockKey);
}

/**
 * Auto-block an IP if it has exceeded the max lockout threshold.
 * Should be called after a failed login when the counter reaches the threshold.
 * Returns true if the IP was newly blocked, false otherwise.
 */
export async function autoBlockIpIfNeeded(ip: string): Promise<{
  newlyBlocked: boolean;
  blockDurationHours: number;
  blockExpiry?: number;
}> {
  const redis = getCacheRedis();
  const now = Math.floor(Date.now() / 1000);
  const blockKey = `login:block:${ip}`;
  const maxLockouts = Number(process.env.LOGIN_MAX_LOCKOUTS_BEFORE_BLOCK ?? DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK);
  const blockDurationHours = Number(process.env.LOGIN_BLOCK_DURATION_HOURS ?? DEFAULT_BLOCK_DURATION_HOURS);

  // Check current block count for this IP
  // We use a separate counter key: `login:lockout_count:{ip}`
  const lockoutKey = `login:lockout_count:${ip}`;
  const currentLockouts = await redis.get(lockoutKey);

  let lockoutCount = 0;
  if (currentLockouts) {
    lockoutCount = Number(currentLockouts);
  }

  if (lockoutCount >= maxLockouts) {
    // Auto-block the IP
    const blockUntil = now + (blockDurationHours * 60 * 60);
    await redis.set(blockKey, String(blockUntil), 'EX', blockDurationHours * 60 * 60);
    // Reset the lockout count after blocking
    await redis.del(lockoutKey);
    // Also clean up old window keys
    // Note: we don't clean up old windows here to avoid performance issues

    return {
      newlyBlocked: true,
      blockDurationHours,
      blockExpiry: blockUntil,
    };
  }

  // Increment lockout count
  await redis.incr(lockoutKey);
  // Set TTL on lockout count key if it was just created
  const ttl = await redis.ttl(lockoutKey);
  if (ttl < 0 || ttl > DEFAULT_WINDOW_MINUTES * 60) {
    await redis.expire(lockoutKey, DEFAULT_WINDOW_MINUTES * 60);
  }

  return {
    newlyBlocked: false,
    blockDurationHours,
  };
}