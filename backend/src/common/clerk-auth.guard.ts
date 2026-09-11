import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InviteStatus, PlatformRole } from '@prisma/client';
import { PrismaService } from '../lib/prisma.service';
import { getClerkClient, roleFromClaims, verifyClerkSession } from '../lib/clerk';
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
      const profile = await resolveClerkProfile(clerkUserId, payload);
      if (profile.email) {
        const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
        if (byEmail) {
          user = await this.prisma.user.update({
            where: { id: byEmail.id },
            data: {
              clerkUserId,
              fullName: profile.fullName || byEmail.fullName,
              institute: profile.institute ?? byEmail.institute,
              department: profile.department ?? byEmail.department,
              phone: profile.phone ?? byEmail.phone,
              isActive: true,
            },
          });
        }
      }
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            clerkUserId,
            email: profile.email || `${clerkUserId}@unknown.local`,
            fullName: profile.fullName || 'Student',
            platformRole: profile.role,
            institute: profile.institute,
            department: profile.department,
            phone: profile.phone,
          },
        });
      }
    }
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    await this.prisma.teamMember.updateMany({
      where: { invitedEmail: user.email, inviteStatus: InviteStatus.pending },
      data: { inviteStatus: InviteStatus.accepted, userId: user.id, joinedAt: new Date() },
    });
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

async function resolveClerkProfile(clerkUserId: string, payload: Record<string, unknown>) {
  const meta = (payload.publicMetadata ?? payload.public_metadata ?? {}) as Record<string, unknown>;
  let email = String(payload.email ?? payload.email_address ?? '').toLowerCase();
  let fullName = String(payload.name ?? payload.full_name ?? '');
  let institute = typeof meta.institute === 'string' ? meta.institute : undefined;
  let department = typeof meta.department === 'string' ? meta.department : undefined;
  let phone = typeof meta.phone === 'string' ? meta.phone : undefined;
  const role = roleFromClaims(payload) as PlatformRole;

  if (!email || !fullName) {
    const clerk = getClerkClient();
    if (clerk) {
      try {
        const cu = await clerk.users.getUser(clerkUserId);
        const primary =
          cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)?.emailAddress ??
          cu.emailAddresses[0]?.emailAddress;
        email = (primary ?? email).toLowerCase();
        fullName = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || fullName;
        const um = (cu.unsafeMetadata ?? {}) as Record<string, unknown>;
        const pm = (cu.publicMetadata ?? {}) as Record<string, unknown>;
        if (!institute && typeof um.institute === 'string') institute = um.institute;
        if (!department && typeof um.department === 'string') department = um.department;
        if (!phone && typeof um.phone === 'string') phone = um.phone;
        if (!institute && typeof pm.institute === 'string') institute = pm.institute;
        if (!department && typeof pm.department === 'string') department = pm.department;
      } catch {
        /* Clerk lookup is best-effort */
      }
    }
  }

  return { email, fullName, role, institute, department, phone };
}
