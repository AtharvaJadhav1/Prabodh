import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extracts the real client IP address, safely inspecting reverse proxy headers
 * (Cloudflare cf-connecting-ip, x-real-ip, x-forwarded-for) with fallback to socket remoteAddress.
 */
export function extractClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    // Standard format: client, proxy1, proxy2...
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first;
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const first = forwardedFor[0].split(',')[0].trim();
    if (first) return first;
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return extractClientIp(req);
});
