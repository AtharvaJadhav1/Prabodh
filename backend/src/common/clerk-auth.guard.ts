import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { PrismaService } from '../lib/prisma.service';
import { verifyAccessToken } from '../lib/jwt';
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

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account not found or disabled');
    if (user.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw new UnauthorizedException('Invalid session');
    }

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
