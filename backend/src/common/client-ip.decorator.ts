import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

function normalizeIp(ip: string): string {
  let cleaned = ip.trim();
  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  // Strip port if present in IPv4 (e.g. 1.2.3.4:5678 -> 1.2.3.4)
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(':')[0];
  }
  // Strip brackets and port in IPv6 (e.g. [2001:db8::1]:8080 -> 2001:db8::1)
  if (cleaned.startsWith('[') && cleaned.includes(']')) {
    cleaned = cleaned.replace(/^\[(.*)\](?::\d+)?$/, '$1');
  }
  return cleaned;
}

/**
 * Extracts the real client IP address, safely inspecting reverse proxy headers
 * (Cloudflare cf-connecting-ip, x-real-ip, x-forwarded-for) with fallback to socket remoteAddress.
 */
export function extractClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return normalizeIp(cfIp);
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return normalizeIp(realIp);
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    // Standard format: client, proxy1, proxy2...
    const first = forwardedFor.split(',')[0].trim();
    if (first) return normalizeIp(first);
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const first = forwardedFor[0].split(',')[0].trim();
    if (first) return normalizeIp(first);
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '127.0.0.1');
}

export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return extractClientIp(req);
});
