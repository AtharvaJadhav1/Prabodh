import { HttpException, HttpStatus } from '@nestjs/common';
import { getRedis } from './queue';

export async function consumeToken(key: string, limitPerMin: number) {
  const redis = getRedis();
  const bucket = `rl:${key}:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.incr(bucket);
  if (count === 1) {
    await redis.expire(bucket, 70);
  }
  if (count > limitPerMin) {
    throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }
}
