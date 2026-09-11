import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PrismaService } from '../lib/prisma.service';
import { roleFromClaims, verifyClerkSession } from '../lib/clerk';
import { AuthUser } from './auth.types';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();

    if (process.env.ALLOW_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      const devId = req.headers['x-dev-user-id'];
      if (devId) {
        const user = await this.prisma.user.findUnique({ where: { id: String(devId) } });
        if (!user || !user.isActive) throw new UnauthorizedException('Unknown or inactive user');
        req.user = toAuth(user);
        return true;
      }
    }

    const header = req.headers.authorization ?? req.headers.Authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = header.slice('Bearer '.length);
    let payload: Record<string, unknown>;
    try {
      payload = (await verifyClerkSession(token)) as unknown as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid session');
    }

    const clerkUserId = String(payload.sub ?? '');
    if (!clerkUserId) throw new UnauthorizedException('Invalid session subject');

    let user = await this.prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      const email = String(payload.email ?? payload.email_address ?? `${clerkUserId}@unknown.local`);
      const fullName = String(payload.name ?? payload.full_name ?? 'Unknown User');
      const role = roleFromClaims(payload) as PlatformRole;
      user = await this.prisma.user.create({
        data: {
          clerkUserId,
          email,
          fullName,
          platformRole: role,
        },
      });
    }
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    req.user = toAuth(user);
    return true;
  }
}

function toAuth(user: {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute: string | null;
}): AuthUser {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    institute: user.institute,
  };
}
