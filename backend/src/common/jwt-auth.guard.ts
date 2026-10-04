import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../lib/prisma.service';
import { verifyAccessToken } from '../lib/jwt';
import { AUTH_USER_SELECT, AuthDbUser, AuthUser } from './auth.types';

type AuthedRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | undefined>;
  user?: AuthUser;
  authDbUser?: AuthDbUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
        attachUser(req, user, null);
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

    // An admin-issued password must be replaced before anything else works.
    if (user.mustChangePassword && !isPasswordChangeAllowed(req)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Please change your password before continuing.',
      });
    }

    attachUser(req, user, payload.activeRole ?? null);
    return true;
  }
}

/** Only reading the profile and changing the password are allowed while a change is pending. */
function isPasswordChangeAllowed(req: AuthedRequest) {
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0].replace(/\/+$/, '');
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'GET' && /\/me$/.test(path)) return true;
  return method === 'POST' && /\/me\/change-password$/.test(path);
}

function attachUser(
  req: AuthedRequest,
  user: AuthDbUser,
  tokenActiveRole: string | null,
) {
  req.authDbUser = user;
  const held = [user.platformRole, ...(user.additionalRoles ?? []).filter(
    (r) => r !== user.platformRole,
  )];
  // Honor the workspace chosen via POST /me/active-role when still held;
  // otherwise fall back to the primary role (e.g. after an admin revokes).
  const activeRole = held.includes(tokenActiveRole as (typeof held)[number])
    ? (tokenActiveRole as (typeof held)[number])
    : held[0];
  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    additionalRoles: user.additionalRoles ?? [],
    activeRole,
    institute: user.institute,
  };
}
