import { HttpException, HttpStatus } from '@nestjs/common';
import { getRedis } from './queue';

export async function consumeToken(key: string, limitPerMin: number) {
  try {
    const redis = getRedis();
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
