import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../lib/prisma.service';
import { verifyAccessToken } from '../lib/jwt';
import { AUTH_USER_SELECT, AuthDbUser, AuthUser } from './auth.types';

type AuthedRequest = {
  headers: Record<string, string | undefined>;
  user?: AuthUser;
  authDbUser?: AuthDbUser;
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    if (process.env.ALLOW_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      const devId = req.headers['x-dev-user-id'];
      if (devId) {
        const user = await this.prisma.user.findUnique({
          where: { id: String(devId) },
          select: AUTH_USER_SELECT,
        });
        if (!user || !user.isActive) throw new UnauthorizedException('Unknown or inactive user');
        attachUser(req, user);
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: AUTH_USER_SELECT,
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Account not found or disabled');
    if (user.email.toLowerCase() !== payload.email.toLowerCase()) {
      throw new UnauthorizedException('Invalid session');
    }

    attachUser(req, user);
    return true;
  }
}

function attachUser(req: AuthedRequest, user: AuthDbUser) {
  req.authDbUser = user;
  req.user = {
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    institute: user.institute,
  };
}
