import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InviteStatus, PlatformRole, Prisma } from '@prisma/client';
import { signAccessToken } from '../../lib/jwt';
import { sendOtp, verifyOtp } from '../../lib/otp';
import { hashPassword, verifyPassword } from '../../lib/password';
import { mapPool } from '../../lib/async-pool';
import { PrismaService } from '../../lib/prisma.service';
import { isS3Configured, normalizeUploadMime, putObjectBuffer } from '../../lib/s3';
import { IdentityRepository } from './repository';

@Injectable()
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly prisma: PrismaService,
  ) {}

  loginByEmail(email: string) {
    return this.repo.findByEmail(email.toLowerCase());
  }

  private issueToken(user: {
    id: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute: string | null;
    department: string | null;
    phone: string | null;
    profileJson?: unknown;
  }) {
    const accessToken = signAccessToken(user);
    return {
      accessToken,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      institute: user.institute,
      department: user.department,
      phone: user.phone,
      profileJson: user.profileJson ?? null,
    };
  }

  private assertPortal(role: PlatformRole, portal: 'student' | 'faculty') {
    const facultyRoles: PlatformRole[] = [
      PlatformRole.admin,
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
    ];
    if (portal === 'student' && role !== PlatformRole.student) {
      throw new ForbiddenException('This account is not a student. Use the faculty login portal.');
    }
    if (portal === 'faculty' && !facultyRoles.includes(role)) {
      throw new ForbiddenException('This account is not faculty or admin. Use the student login portal.');
    }
  }

  async loginWithPassword(body: { email: string; password: string; portal?: 'student' | 'faculty' }) {
    const email = body.email.toLowerCase();
    const user = await this.repo.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'No password is set for this account. Use Forgot password or ask your administrator.',
      );
    }
    if (!verifyPassword(body.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (body.portal) {
      this.assertPortal(user.platformRole, body.portal);
    }
    void this.acceptPendingTeamInvites(user.id, user.email).catch(() => undefined);
    return this.issueToken(user);
  }

  async requestOtp(body: {
    email: string;
    purpose: 'login' | 'register';
    accountType?: 'student' | 'faculty' | 'industry';
    password?: string;
    fullName?: string;
    institute?: string;
    department?: string;
    phone?: string;
  }) {
    const email = body.email.toLowerCase();
    const user = await this.repo.findByEmail(email);
    const accountType = body.accountType ?? 'student';
    const targetRole =
      accountType === 'industry'
        ? PlatformRole.industry_mentor
        : accountType === 'faculty'
          ? PlatformRole.institute_mentor
          : PlatformRole.student;

    if (body.purpose === 'login') {
      if (!user || !user.isActive) {
        throw new NotFoundException('No account found for this email. Register first or contact your admin.');
      }
      const result = await sendOtp({ email, purpose: 'login' });
      return { ok: true, message: 'Verification code sent to your email.', devCode: result.devCode };
    }

    if (accountType !== 'student') {
      throw new ForbiddenException(
        'Faculty and staff accounts are created by your administrator. Use the login details sent to your email.',
      );
    }

    if (user && user.platformRole !== targetRole) {
      throw new BadRequestException('This email is already registered with another role. Sign in instead.');
    }

    if (!body.fullName?.trim()) {
      throw new BadRequestException('Full name is required for registration.');
    }
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const result = await sendOtp({
      email,
      purpose: 'register',
      profile: {
        email,
        fullName: body.fullName.trim(),
        password: body.password,
        platformRole: targetRole,
        institute: body.institute?.trim(),
        department: body.department?.trim(),
        phone: body.phone?.trim(),
      },
    });
    return { ok: true, message: 'Verification code sent to your email.', devCode: result.devCode };
  }

  async verifyOtpAndIssueToken(body: {
    email: string;
    purpose: 'login' | 'register';
    code: string;
    portal?: 'student' | 'faculty';
  }) {
    const email = body.email.toLowerCase();
    const check = await verifyOtp({ email, purpose: body.purpose, code: body.code });
    if (!check.ok) throw new UnauthorizedException(check.reason);

    let user =
      body.purpose === 'login'
        ? await this.repo.findByEmail(email)
        : await this.registerFromOtpProfile(check.profile ?? { email, fullName: 'Student', password: '', platformRole: 'student' });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or disabled.');
    }

    if (body.purpose === 'login' && body.portal) {
      this.assertPortal(user.platformRole, body.portal);
    }

    void this.acceptPendingTeamInvites(user.id, user.email).catch(() => undefined);
    return this.issueToken(user);
  }

  async devLoginIssueToken(email: string) {
    const user = await this.repo.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unknown or inactive account');
    }
    void this.acceptPendingTeamInvites(user.id, user.email).catch(() => undefined);
    return this.issueToken(user);
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.repo.findByEmail(normalized);
    if (!user || !user.isActive) {
      throw new NotFoundException('No account found for this email.');
    }
    const result = await sendOtp({ email: normalized, purpose: 'reset_password' });
    return {
      ok: true,
      message: 'If an account exists for this email, a reset code has been sent.',
      devCode: result.devCode,
    };
  }

  async resetPasswordWithOtp(body: { email: string; code: string; password: string }) {
    const email = body.email.trim().toLowerCase();
    const check = await verifyOtp({ email, purpose: 'reset_password', code: body.code });
    if (!check.ok) throw new UnauthorizedException(check.reason);

    const user = await this.repo.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or disabled.');
    }
    await this.repo.updatePasswordHash(user.id, hashPassword(body.password));
    return { ok: true, message: 'Password updated. You can sign in now.' };
  }

  private registerFromOtpProfile(body: {
    email: string;
    password: string;
    fullName: string;
    platformRole: 'student' | 'institute_mentor' | 'industry_mentor';
    institute?: string;
    department?: string;
    phone?: string;
  }) {
    if (
      body.platformRole === PlatformRole.institute_mentor ||
      body.platformRole === PlatformRole.industry_mentor
    ) {
      return this.registerFaculty({
        ...body,
        mentorKind: body.platformRole === PlatformRole.industry_mentor ? 'industry' : 'institute',
      });
    }
    return this.registerStudent(body);
  }

  async registerFaculty(body: {
    email: string;
    password?: string;
    fullName: string;
    institute?: string;
    department?: string;
    phone?: string;
    mentorKind?: 'institute' | 'industry';
  }) {
    const email = body.email.toLowerCase();
    const role =
      body.mentorKind === 'industry' ? PlatformRole.industry_mentor : PlatformRole.institute_mentor;
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      if (existing.platformRole !== role) {
        throw new BadRequestException('This email is already registered with another role. Sign in instead.');
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          institute: body.institute ?? existing.institute,
          department: body.department ?? existing.department,
          phone: body.phone ?? existing.phone,
          isActive: true,
          ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
        },
      });
    }
    if (!body.password) {
      throw new BadRequestException('Password is required for registration.');
    }
    return this.prisma.user.create({
      data: {
        clerkUserId: `local:${email}`,
        email,
        fullName: body.fullName,
        platformRole: role,
        institute: body.institute,
        department: body.department,
        phone: body.phone,
        passwordHash: hashPassword(body.password),
      },
    });
  }

  async createStaffAccount(body: {
    email: string;
    password: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string;
    department?: string;
  }) {
    const allowed: PlatformRole[] = [
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
      PlatformRole.admin,
    ];
    if (!allowed.includes(body.platformRole)) {
      throw new BadRequestException('Staff invite supports institute mentor, industry mentor, or admin roles only.');
    }
    const email = body.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }
    return this.prisma.user.create({
      data: {
        clerkUserId: `local:${email}`,
        email,
        fullName: body.fullName,
        platformRole: body.platformRole,
        institute: body.institute,
        department: body.department,
        passwordHash: hashPassword(body.password),
        isActive: true,
      },
    });
  }

  async registerStudent(body: {
    email: string;
    password?: string;
    fullName: string;
    institute?: string;
    department?: string;
    phone?: string;
  }) {
    const email = body.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      if (existing.platformRole !== PlatformRole.student) {
        throw new BadRequestException('This email is already registered with another role. Sign in instead.');
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          institute: body.institute ?? existing.institute,
          department: body.department ?? existing.department,
          phone: body.phone ?? existing.phone,
          isActive: true,
          ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
        },
      });
    }
    if (!body.password) {
      throw new BadRequestException('Password is required for registration.');
    }
    return this.prisma.user.create({
      data: {
        clerkUserId: `local:${email}`,
        email,
        fullName: body.fullName,
        platformRole: PlatformRole.student,
        institute: body.institute,
        department: body.department,
        phone: body.phone,
        passwordHash: hashPassword(body.password),
      },
    });
  }

  async registerWithPassword(body: {
    email: string;
    password: string;
    fullName: string;
    institute?: string;
    department?: string;
    phone?: string;
  }) {
    const email = body.email.toLowerCase();
    const result = await sendOtp({
      email,
      purpose: 'register',
      profile: {
        email,
        fullName: body.fullName.trim(),
        password: body.password,
        platformRole: PlatformRole.student,
        institute: body.institute?.trim(),
        department: body.department?.trim(),
        phone: body.phone?.trim(),
      },
    });
    return {
      ok: true,
      message: 'Verification code sent to your email. Enter the OTP to complete registration.',
      devCode: result.devCode,
    };
  }

  async registerFacultyWithPassword(body: {
    email: string;
    password: string;
    fullName: string;
    institute?: string;
    department?: string;
    phone?: string;
    mentorKind?: 'institute' | 'industry';
  }) {
    const email = body.email.toLowerCase();
    const role =
      body.mentorKind === 'industry' ? PlatformRole.industry_mentor : PlatformRole.institute_mentor;
    const result = await sendOtp({
      email,
      purpose: 'register',
      profile: {
        email,
        fullName: body.fullName.trim(),
        password: body.password,
        platformRole: role,
        institute: body.institute?.trim(),
        department: body.department?.trim(),
        phone: body.phone?.trim(),
      },
    });
    return {
      ok: true,
      message:
        role === PlatformRole.industry_mentor
          ? 'Verification code sent. Enter the OTP to complete industry mentor registration.'
          : 'Verification code sent to your email. Enter the OTP to complete faculty registration.',
      devCode: result.devCode,
    };
  }

  async updateProfile(
    userId: string,
    body: {
      fullName?: string;
      phone?: string;
      department?: string;
      institute?: string;
      profileJson?: Record<string, unknown>;
    },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');

    const mergedProfile =
      body.profileJson !== undefined
        ? {
            ...((existing.profileJson as Record<string, unknown> | null) ?? {}),
            ...body.profileJson,
          }
        : undefined;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.institute !== undefined ? { institute: body.institute } : {}),
        ...(mergedProfile !== undefined
          ? { profileJson: mergedProfile as Prisma.InputJsonValue }
          : {}),
      },
    });
    const { passwordHash: _ph, ...safe } = updated;
    return safe;
  }

  async uploadAvatar(
    userId: string,
    body: { filename: string; contentType: string; dataBase64: string },
  ) {
    const mime = normalizeUploadMime(body.filename, body.contentType);
    if (!isAvatarMime(mime)) {
      throw new BadRequestException('Only PNG, JPEG, WebP or GIF images are supported.');
    }
    const data = Buffer.from(body.dataBase64, 'base64');
    if (data.length === 0) {
      throw new BadRequestException('Image data is empty.');
    }
    if (data.length > AVATAR_MAX_BYTES) {
      throw new BadRequestException('Image exceeds the 5MB limit.');
    }

    let avatarUrl: string;
    if (isS3Configured()) {
      const key = `avatars/${userId}/avatar-${Date.now()}${extensionForMime(mime)}`;
      const result = await putObjectBuffer(key, data, mime);
      avatarUrl = result.publicUrl;
    } else {
      avatarUrl = `data:${mime};base64,${body.dataBase64}`;
    }

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');
    const profileJson = ((existing.profileJson as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >;
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileJson: { ...profileJson, avatarUrl } as Prisma.InputJsonValue },
    });
    return { avatarUrl };
  }

  async handleClerkEvent(eventType: string, data: Record<string, unknown>) {
    if (eventType.startsWith('user.')) {
      return this.syncClerkUser(eventType, data);
    }
    if (
      eventType === 'organizationInvitation.accepted' ||
      eventType === 'organizationMembership.created'
    ) {
      return this.syncOrgMembership(data);
    }
    return { ignored: eventType };
  }

  async syncClerkUser(eventType: string, data: Record<string, unknown>) {
    const clerkUserId = String(data.id ?? '');
    if (!clerkUserId) return null;

    if (eventType === 'user.deleted') {
      await this.repo.deactivateByClerkId(clerkUserId);
      return { clerkUserId, deactivated: true };
    }

    const email = extractPrimaryEmail(data) ?? `${clerkUserId}@unknown.local`;
    const first = String((data.first_name as string) ?? '');
    const last = String((data.last_name as string) ?? '');
    const fullName = `${first} ${last}`.trim() || email;
    const meta = (data.public_metadata ?? {}) as Record<string, unknown>;
    const platformRole = parseRole(meta.role);
    const institute = typeof meta.institute === 'string' ? meta.institute : undefined;
    const department = typeof meta.department === 'string' ? meta.department : undefined;
    const phone = typeof meta.phone === 'string' ? meta.phone : undefined;

    const user = await this.repo.upsertFromClerk({
      clerkUserId,
      email,
      fullName,
      platformRole,
      institute,
      department,
      phone,
    });
    await this.acceptPendingInvitesForUser(user.id, email, clerkUserId);
    return user;
  }

  async syncOrgMembership(data: Record<string, unknown>) {
    const orgId = String(
      (data.organization as { id?: string } | undefined)?.id ?? data.organization_id ?? '',
    );
    const email = String(
      data.email_address ??
        (data.public_user_data as { identifier?: string } | undefined)?.identifier ??
        '',
    ).toLowerCase();
    const clerkUserId = String(
      data.user_id ?? (data.public_user_data as { user_id?: string } | undefined)?.user_id ?? '',
    );
    const invitationId = String(data.id ?? data.invitation_id ?? '');
    if (!orgId) return { skipped: true };

    const team = await this.prisma.team.findUnique({ where: { clerkOrgId: orgId } });
    if (!team) return { skipped: 'unknown_org' };

    const user = clerkUserId
      ? await this.prisma.user.findUnique({ where: { clerkUserId } })
      : email
        ? await this.prisma.user.findUnique({ where: { email } })
        : null;

    if (invitationId) {
      await this.prisma.teamMember.updateMany({
        where: { clerkInvitationId: invitationId },
        data: {
          inviteStatus: InviteStatus.accepted,
          userId: user?.id,
          joinedAt: new Date(),
        },
      });
    }
    if (email) {
      await this.prisma.teamMember.updateMany({
        where: { teamId: team.id, invitedEmail: email, inviteStatus: InviteStatus.pending },
        data: {
          inviteStatus: InviteStatus.accepted,
          userId: user?.id,
          joinedAt: new Date(),
        },
      });
    }
    return { teamId: team.id, email, accepted: true };
  }

  async acceptPendingTeamInvites(userId: string, email: string) {
    const existingTeam = await this.prisma.team.findFirst({
      where: {
        OR: [
          { leaderUserId: userId },
          { members: { some: { userId, inviteStatus: InviteStatus.accepted } } },
        ],
      },
      select: { id: true },
    });
    if (existingTeam) return;

    const pending = await this.prisma.teamMember.findFirst({
      where: { invitedEmail: email, inviteStatus: InviteStatus.pending },
      orderBy: { createdAt: 'asc' },
    });
    if (!pending) return;

    await this.prisma.teamMember.update({
      where: { id: pending.id },
      data: { inviteStatus: InviteStatus.accepted, userId, joinedAt: new Date() },
    });
  }

  private async acceptPendingInvitesForUser(userId: string, email: string, clerkUserId: string) {
    await this.acceptPendingTeamInvites(userId, email);
    void clerkUserId;
  }

  async bulkCreate(rows: Array<{
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string;
    department?: string;
    /** When set, stores a password hash (used for staff credential emails). */
    password?: string;
  }>) {
    return mapPool(rows, 8, async (row) => {
      try {
        const email = row.email.toLowerCase();
        const existing = await this.repo.findByEmail(email);
        if (existing) {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              fullName: row.fullName,
              platformRole: row.platformRole,
              institute: row.institute ?? existing.institute,
              department: row.department ?? existing.department,
              isActive: true,
              ...(row.password ? { passwordHash: hashPassword(row.password) } : {}),
            },
          });
        } else {
          await this.prisma.user.create({
            data: {
              clerkUserId: `local:${email}`,
              email,
              fullName: row.fullName,
              platformRole: row.platformRole,
              institute: row.institute,
              department: row.department,
              ...(row.password ? { passwordHash: hashPassword(row.password) } : {}),
            },
          });
        }
        return { email: row.email, status: 'created' as const, password: row.password };
      } catch (err) {
        return {
          email: row.email,
          status: 'failed' as const,
          error: err instanceof Error ? err.message : 'unknown',
        };
      }
    });
  }
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const AVATAR_MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function isAvatarMime(mime: string) {
  return mime in AVATAR_MIME_EXT;
}

function extensionForMime(mime: string) {
  return AVATAR_MIME_EXT[mime] ?? '.png';
}

function parseRole(role: unknown): PlatformRole {
  if (role === 'admin' || role === 'institute_mentor' || role === 'industry_mentor' || role === 'student') {
    return role;
  }
  return 'student';
}

function extractPrimaryEmail(data: Record<string, unknown>): string | null {
  const addresses = data.email_addresses as Array<{ id: string; email_address: string }> | undefined;
  const primaryId = data.primary_email_address_id as string | undefined;
  if (!addresses?.length) return null;
  const primary = addresses.find((a) => a.id === primaryId) ?? addresses[0];
  return primary.email_address.toLowerCase();
}

export function parseCsvUsers(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new BadRequestException('CSV needs a header and at least one row');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf('email');
  const nameIdx = header.indexOf('full_name') >= 0 ? header.indexOf('full_name') : header.indexOf('name');
  const roleIdx = header.indexOf('role');
  const instIdx = header.indexOf('institute');
  const deptIdx = header.indexOf('department');
  if (emailIdx < 0 || nameIdx < 0 || roleIdx < 0) {
    throw new BadRequestException('CSV must include email, full_name, role columns');
  }
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const role = parseRole(cols[roleIdx]);
    return {
      email: cols[emailIdx],
      fullName: cols[nameIdx],
      platformRole: role,
      institute: instIdx >= 0 ? cols[instIdx] : undefined,
      department: deptIdx >= 0 ? cols[deptIdx] : undefined,
    };
  });
}
