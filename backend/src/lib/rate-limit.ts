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
