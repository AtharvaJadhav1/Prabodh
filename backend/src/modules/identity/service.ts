import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { signAccessToken } from '../../lib/jwt';
import { allRoles, hasAnyRole, hasRole, unionAdditionalRoles } from '../../lib/roles';
import { consumeResetToken, issueResetToken, sendOtp, verifyOtp } from '../../lib/otp';
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

  private mapOtpDeliveryError(err: unknown): never {
    const msg = err instanceof Error ? err.message : String(err);
    if (/OTP storage|redis|cluster|ECONNREFUSED|ETIMEDOUT|Stream isn't writeable/i.test(msg)) {
      throw new ServiceUnavailableException(
        'Verification codes are temporarily unavailable. Wait a minute and try again.',
      );
    }
    if (/RESEND|RESEND_FROM|RESEND_API|email send|verified domain/i.test(msg)) {
      throw new ServiceUnavailableException(
        'We could not send the verification email. Confirm your email address or try again later. If this keeps happening, contact support.',
      );
    }
    console.error('[identity] OTP delivery failed', msg);
    throw new InternalServerErrorException('Could not send verification code. Please try again.');
  }

  private issueToken(
    user: {
      id: string;
      email: string;
      fullName: string;
      platformRole: PlatformRole;
      additionalRoles?: PlatformRole[] | null;
      institute: string | null;
      department: string | null;
      phone: string | null;
      profileJson?: unknown;
    },
    activeRole?: PlatformRole | null,
  ) {
    let accessToken: string;
    try {
      accessToken = signAccessToken({ ...user, activeRole });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('AUTH_JWT_SECRET')) {
        throw new InternalServerErrorException(
          'Sign-in is temporarily unavailable (server auth is not configured). Contact support.',
        );
      }
      throw err;
    }
    const roles = allRoles(user);
    return {
      accessToken,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      additionalRoles: roles.filter((r) => r !== user.platformRole),
      activeRole: activeRole && roles.includes(activeRole) ? activeRole : user.platformRole,
      institute: user.institute,
      department: user.department,
      phone: user.phone,
      profileJson: user.profileJson ?? null,
    };
  }

  private assertPortal(
    user: { platformRole: PlatformRole; additionalRoles?: PlatformRole[] | null },
    portal: 'student' | 'faculty',
  ) {
    const facultyRoles: PlatformRole[] = [
      PlatformRole.admin,
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
    ];
    // Dual-role accounts pass any portal one of their held roles belongs to.
    if (portal === 'student' && !hasRole(user, PlatformRole.student)) {
      throw new ForbiddenException('This account is not a student. Use the faculty login portal.');
    }
    if (portal === 'faculty' && !hasAnyRole(user, facultyRoles)) {
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
      this.assertPortal(user, body.portal);
    }
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
      let result: { devCode?: string };
      try {
        result = await sendOtp({ email, purpose: 'login' });
      } catch (err) {
        this.mapOtpDeliveryError(err);
      }
      return { ok: true, message: 'Verification code sent to your email.', devCode: result.devCode };
    }

    if (user && !user.isActive) {
      throw new ForbiddenException('This account is deactivated. Contact your administrator.');
    }

    // Cross-role registration rules. Mentor↔mentor is allowed (dual-role grant
    // completed on OTP verify); student↔staff mixing stays blocked.
    if (user && !hasRole(user, targetRole)) {
      const targetIsMentor =
        targetRole === PlatformRole.institute_mentor || targetRole === PlatformRole.industry_mentor;
      const userIsMentor =
        hasRole(user, PlatformRole.institute_mentor) || hasRole(user, PlatformRole.industry_mentor);
      if (!(targetIsMentor && userIsMentor)) {
        throw new BadRequestException('This email is already registered with another role. Sign in instead.');
      }
    }

    if (user && user.isActive && body.purpose === 'register' && accountType === 'student') {
      throw new BadRequestException(
        'This email already has an account. Sign in instead of registering again.',
      );
    }

    if (!body.fullName?.trim()) {
      throw new BadRequestException('Full name is required for registration.');
    }
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    let result: { devCode?: string };
    try {
      result = await sendOtp({
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
    } catch (err) {
      this.mapOtpDeliveryError(err);
    }
    const message =
      accountType === 'industry'
        ? 'Verification code sent. Enter the OTP to complete industry mentor registration.'
        : accountType === 'faculty'
          ? 'Verification code sent to your email. Enter the OTP to complete faculty registration.'
          : 'Verification code sent to your email.';
    return { ok: true, message, devCode: result.devCode };
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
      this.assertPortal(user, body.portal);
    }

    return this.issueToken(user);
  }

  async devLoginIssueToken(email: string) {
    const user = await this.repo.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unknown or inactive account');
    }
    return this.issueToken(user);
  }

  async requestPasswordReset(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.repo.findByEmail(normalized);
    const message = 'If an account exists for this email, a reset code has been sent.';
    // Same generic response for unknown / disabled accounts (no account enumeration).
    if (!user || !user.isActive) {
      return { ok: true, message };
    }
    let result: { devCode?: string };
    try {
      result = await sendOtp({ email: normalized, purpose: 'reset_password' });
    } catch (err) {
      this.mapOtpDeliveryError(err);
    }
    return { ok: true, message, devCode: result.devCode };
  }

  /** Step 2: check the emailed code. Only then is the caller allowed to choose a new password. */
  async verifyPasswordResetCode(body: { email: string; code: string }) {
    const email = body.email.trim().toLowerCase();
    const check = await verifyOtp({ email, purpose: 'reset_password', code: body.code });
    if (!check.ok) throw new UnauthorizedException(check.reason);
    const user = await this.repo.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or disabled.');
    }
    return { ok: true, resetToken: await issueResetToken(email) };
  }

  /** Step 3: set the new password using the token from a verified code. */
  async resetPasswordWithOtp(body: { email: string; resetToken: string; password: string }) {
    const email = body.email.trim().toLowerCase();
    const valid = await consumeResetToken(email, body.resetToken);
    if (!valid) {
      throw new UnauthorizedException('Verification expired. Request a new code and verify it again.');
    }
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
    let user;
    if (existing) {
      if (!existing.isActive) {
        throw new ForbiddenException('This account is deactivated. Contact your administrator.');
      }
      if (hasRole(existing, PlatformRole.student)) {
        throw new BadRequestException('This email is already registered as a student. Sign in instead.');
      }
      // Same-role re-register OR cross-mentor dual grant: merge, never clobber.
      const additionalRoles = unionAdditionalRoles(existing, role);
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          institute: body.institute ?? existing.institute,
          department: body.department ?? existing.department,
          phone: body.phone ?? existing.phone,
          additionalRoles: additionalRoles.length > 0 ? additionalRoles : undefined,
          ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
        },
      });
    } else {
      if (!body.password) {
        throw new BadRequestException('Password is required for registration.');
      }
      user = await this.prisma.user.create({
        data: {
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
    if (role === PlatformRole.industry_mentor) {
      await this.syncIndustrialMentorProfile({
        userId: user.id,
        fullName: body.fullName,
        email,
        phone: body.phone,
        companyName: body.institute,
        designation: body.department,
      });
    }
    return user;
  }

  /**
   * Admin single-invite / grant. Existing accounts are MERGED (role union),
   * never overwritten. Password is only (re)set for brand-new accounts or
   * when `resetPassword` is explicitly requested — a later role grant keeps
   * the current password so active sessions survive.
   */
  async createStaffAccount(
    body: {
      email: string;
      password?: string;
      fullName: string;
      platformRole: PlatformRole;
      institute?: string;
      department?: string;
    },
    opts?: { resetPassword?: boolean },
  ) {
    const allowed: PlatformRole[] = [
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
      PlatformRole.admin,
      PlatformRole.student_expert,
    ];
    if (!allowed.includes(body.platformRole)) {
      throw new BadRequestException(
        'Staff invite supports institute mentor, industry mentor, student expert, or admin roles only.',
      );
    }
    const email = body.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      if (existing.platformRole === PlatformRole.student) {
        throw new BadRequestException(
          'This email is already registered as a student and cannot be converted to staff.',
        );
      }
      const alreadyHeld = hasRole(existing, body.platformRole);
      const additionalRoles = unionAdditionalRoles(existing, body.platformRole);
      // Password rule: a role grant never rotates the password by itself —
      // rotation happens only when the admin explicitly requests a reset.
      const rotatePassword = Boolean(body.password) && opts?.resetPassword === true;
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          institute: body.institute ?? existing.institute,
          department: body.department ?? existing.department,
          additionalRoles: additionalRoles.length > 0 ? additionalRoles : undefined,
          ...(rotatePassword ? { passwordHash: hashPassword(body.password as string) } : {}),
          isActive: true,
        },
      });
      if (body.platformRole === PlatformRole.industry_mentor) {
        await this.syncIndustrialMentorProfile({
          userId: user.id,
          fullName: body.fullName,
          email,
          companyName: body.institute,
          designation: body.department,
        });
      }
      return {
        user,
        created: false,
        granted: !alreadyHeld,
        passwordRotated: rotatePassword,
      };
    }
    if (!body.password) {
      throw new BadRequestException('Password is required for a new staff account.');
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: body.fullName,
        platformRole: body.platformRole,
        institute: body.institute,
        department: body.department,
        passwordHash: hashPassword(body.password),
        isActive: true,
      },
    });

    if (body.platformRole === PlatformRole.industry_mentor) {
      await this.syncIndustrialMentorProfile({
        userId: user.id,
        fullName: body.fullName,
        email,
        companyName: body.institute,
        designation: body.department,
      });
    }
    return { user, created: true, granted: true, passwordRotated: true };
  }

  /**
   * Upsert industrial mentor directory row; recover from email/userId unique collisions.
   * Only fields with a non-empty value are written — an update never blanks existing data.
   */
  private async syncIndustrialMentorProfile(opts: {
    userId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    companyName?: string | null;
    designation?: string | null;
  }) {
    const data = buildIndustrialMentorData(opts);

    const byUser = await this.prisma.industrialMentor.findUnique({ where: { userId: opts.userId } });
    if (byUser) {
      await this.prisma.industrialMentor.update({ where: { userId: opts.userId }, data });
      return;
    }

    const byEmail = await this.prisma.industrialMentor.findUnique({ where: { email: opts.email } });
    if (byEmail) {
      // Keep the directory row id (team FKs stay valid) and re-point it at this user.
      await this.prisma.industrialMentor.update({
        where: { id: byEmail.id },
        data: { userId: opts.userId, ...data },
      });
      return;
    }

    await this.prisma.industrialMentor.create({
      data: { userId: opts.userId, ...data, fullName: data.fullName ?? opts.fullName, email: opts.email },
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
      if (!existing.isActive) {
        throw new ForbiddenException('This account is deactivated. Contact your administrator.');
      }
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: body.fullName,
          institute: body.institute ?? existing.institute,
          department: body.department ?? existing.department,
          phone: body.phone ?? existing.phone,
          ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
        },
      });
    }
    if (!body.password) {
      throw new BadRequestException('Password is required for registration.');
    }
    return this.prisma.user.create({
      data: {
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
    if (hasRole(updated, PlatformRole.industry_mentor)) {
      // Mirror into the directory row. institute/department double as college vs
      // company, so they are only mirrored for industry-only accounts; dual-role
      // accounts mirror just the role-agnostic fields (name, phone).
      const industryOnly = !hasRole(updated, PlatformRole.institute_mentor);
      const { isActive: _ignored, ...mirror } = buildIndustrialMentorData({
        fullName: body.fullName,
        phone: body.phone,
        companyName: industryOnly ? body.institute : undefined,
        designation: industryOnly ? body.department : undefined,
      });
      if (Object.keys(mirror).length > 0) {
        await this.prisma.industrialMentor.updateMany({ where: { userId }, data: mirror });
      }
    }
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

  /**
   * Bulk upsert for CSV activation. Rows are grouped by email FIRST so two rows
   * for one address (different roles) merge into a single dual-role account
   * instead of racing/overwriting each other in the concurrent pool.
   * Passwords are only set for brand-new accounts (or explicit resets) —
   * existing accounts keep their hash on a pure role grant.
   */
  async bulkCreate(rows: Array<{
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string;
    department?: string;
    /** When set AND the account is new (or resetPassword), stores a password hash. */
    password?: string;
    /** Explicit admin-requested rotation for an existing account. */
    resetPassword?: boolean;
  }>) {
    // Group by email: union roles, first non-empty profile wins, first password wins.
    const grouped = new Map<
      string,
      {
        email: string;
        fullName: string;
        roles: PlatformRole[];
        institute?: string;
        department?: string;
        password?: string;
        resetPassword?: boolean;
      }
    >();
    for (const row of rows) {
      const key = row.email.toLowerCase();
      const slot = grouped.get(key);
      if (!slot) {
        grouped.set(key, {
          email: row.email,
          fullName: row.fullName,
          roles: [row.platformRole],
          institute: row.institute,
          department: row.department,
          password: row.password,
          resetPassword: row.resetPassword,
        });
      } else {
        if (!slot.roles.includes(row.platformRole)) slot.roles.push(row.platformRole);
        if (!slot.password && row.password) slot.password = row.password;
        if (row.resetPassword) slot.resetPassword = true;
        if (!slot.institute && row.institute) slot.institute = row.institute;
        if (!slot.department && row.department) slot.department = row.department;
      }
    }

    return mapPool([...grouped.values()], 8, async (slot) => {
      try {
        const email = slot.email.toLowerCase();
        const existing = await this.repo.findByEmail(email);
        const [primary, ...rest] = slot.roles;
        const mixError = studentStaffMixError(existing ? allRoles(existing) : [], slot.roles);
        if (mixError) throw new BadRequestException(mixError);
        if (existing) {
          let additionalRoles = Array.isArray(existing.additionalRoles)
            ? [...existing.additionalRoles]
            : [];
          for (const role of slot.roles) {
            additionalRoles = unionAdditionalRoles(
              { platformRole: existing.platformRole, additionalRoles },
              role,
            );
          }
          const rotatePassword = Boolean(slot.password) && slot.resetPassword === true;
          const user = await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              fullName: slot.fullName,
              institute: slot.institute ?? existing.institute,
              department: slot.department ?? existing.department,
              additionalRoles: additionalRoles.length > 0 ? additionalRoles : undefined,
              isActive: true,
              ...(rotatePassword ? { passwordHash: hashPassword(slot.password as string) } : {}),
            },
          });
          const heldAfter = allRoles(user);
          const granted = slot.roles.filter((r) => r !== existing.platformRole &&
            !(existing.additionalRoles ?? []).includes(r));

          if (slot.roles.includes(PlatformRole.industry_mentor)) {
            await this.syncIndustrialMentorProfile({
              userId: user.id,
              fullName: slot.fullName,
              email,
              companyName: slot.institute,
              designation: slot.department,
            });
          }

          return {
            email: slot.email,
            status: 'created' as const,
            // Only newly-set plaintext is ever returned (for the credential email).
            password: rotatePassword ? slot.password : undefined,
            isNewUser: false,
            grantedRoles: granted,
            roles: heldAfter,
          };
        }
        const user = await this.prisma.user.create({
          data: {
            email,
            fullName: slot.fullName,
            platformRole: primary,
            ...(rest.length > 0 ? { additionalRoles: rest } : {}),
            institute: slot.institute,
            department: slot.department,
            ...(slot.password ? { passwordHash: hashPassword(slot.password) } : {}),
          },
        });

        if (slot.roles.includes(PlatformRole.industry_mentor)) {
          await this.syncIndustrialMentorProfile({
            userId: user.id,
            fullName: slot.fullName,
            email,
            companyName: slot.institute,
            designation: slot.department,
          });
        }

        return {
          email: slot.email,
          status: 'created' as const,
          password: slot.password,
          isNewUser: true,
          grantedRoles: slot.roles,
          roles: allRoles(user),
        };
      } catch (err) {
        return {
          email: slot.email,
          status: 'failed' as const,
          error: err instanceof Error ? err.message : 'unknown',
        };
      }
    });
  }

  /**
   * Switch the workspace a dual-role account is acting in. Persists the choice
   * (cross-device memory) and re-issues a token carrying it for audit attribution.
   */
  async switchActiveRole(userId: string, role: PlatformRole) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing || !existing.isActive) {
      throw new UnauthorizedException('Account not found or disabled.');
    }
    if (!allRoles(existing).includes(role)) {
      throw new ForbiddenException('This account does not hold that role.');
    }
    const profile = ((existing.profileJson as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileJson: { ...profile, lastActiveRole: role } as Prisma.InputJsonValue },
    });
    return this.issueToken(updated, role);
  }
}

/** Non-empty trimmed string or undefined. */
function nonEmpty(v: string | null | undefined): string | undefined {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : undefined;
}

/** Directory-row payload containing only provided, non-empty fields. */
export function buildIndustrialMentorData(opts: {
  fullName?: string | null;
  email?: string;
  phone?: string | null;
  companyName?: string | null;
  designation?: string | null;
}) {
  const data: {
    fullName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    designation?: string;
    isActive: boolean;
  } = { isActive: true };
  const fullName = nonEmpty(opts.fullName);
  const phone = nonEmpty(opts.phone);
  const companyName = nonEmpty(opts.companyName);
  const designation = nonEmpty(opts.designation);
  if (fullName) data.fullName = fullName;
  if (opts.email) data.email = opts.email;
  if (phone) data.phone = phone;
  if (companyName) data.companyName = companyName;
  if (designation) data.designation = designation;
  return data;
}

/** Student accounts must never be combined with any other role. Returns an error message or null. */
export function studentStaffMixError(held: PlatformRole[], requested: PlatformRole[]): string | null {
  const all = [...held, ...requested];
  if (all.includes(PlatformRole.student) && all.some((r) => r !== PlatformRole.student)) {
    return held.includes(PlatformRole.student)
      ? 'This email is already registered as a student and cannot be converted to staff.'
      : 'A student role cannot be combined with staff roles for the same email.';
  }
  return null;
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

/** Normalize CSV / form role labels into PlatformRole (never silently collapse mentors to student). */
export function parseRole(role: unknown): PlatformRole {
  const raw = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const aliases: Record<string, PlatformRole> = {
    admin: PlatformRole.admin,
    nodal_admin: PlatformRole.admin,
    nodaladmin: PlatformRole.admin,
    institute_mentor: PlatformRole.institute_mentor,
    institutementor: PlatformRole.institute_mentor,
    faculty: PlatformRole.institute_mentor,
    faculty_mentor: PlatformRole.institute_mentor,
    facultymentor: PlatformRole.institute_mentor,
    mentor: PlatformRole.institute_mentor,
    mentors: PlatformRole.institute_mentor,
    institute_mentors: PlatformRole.institute_mentor,
    industry_mentor: PlatformRole.industry_mentor,
    industrial_mentor: PlatformRole.industry_mentor,
    industrymentor: PlatformRole.industry_mentor,
    industrialmentor: PlatformRole.industry_mentor,
    industry_mentors: PlatformRole.industry_mentor,
    industrial_mentors: PlatformRole.industry_mentor,
    industry: PlatformRole.industry_mentor,
    student: PlatformRole.student,
    student_expert: PlatformRole.student_expert,
    studentexpert: PlatformRole.student_expert,
    expert: PlatformRole.student_expert,
    sih_expert: PlatformRole.student_expert,
  };

  const hit = aliases[raw];
  if (hit) return hit;
  throw new BadRequestException(
    `Unknown platformRole "${String(role)}". Use student, institute_mentor, industry_mentor, student_expert, or admin.`,
  );
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cols.push(field.trim());
      field = '';
    } else {
      field += c;
    }
  }
  cols.push(field.trim());
  return cols;
}

function detectCsvDelimiter(headerLine: string): ',' | ';' {
  // Excel in many locales exports `;` — prefer the delimiter that yields more columns.
  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const c = headerLine[i];
    if (c === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (inQuotes) continue;
    if (c === ',') commas++;
    if (c === ';') semis++;
  }
  return semis > commas ? ';' : ',';
}

function splitDelimitedLine(line: string, delimiter: ',' | ';'): string[] {
  if (delimiter === ',') return splitCsvLine(line);
  const cols: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      cols.push(field.trim());
      field = '';
    } else {
      field += c;
    }
  }
  cols.push(field.trim());
  return cols;
}

export function parseCsvUsers(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2) throw new BadRequestException('CSV needs a header and at least one row');
  const delimiter = detectCsvDelimiter(lines[0]);
  const header = splitDelimitedLine(lines[0], delimiter).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  );
  const col = (...names: string[]) => {
    for (const name of names) {
      const idx = header.indexOf(name);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const emailIdx = col('email');
  const nameIdx = col('full_name', 'fullname', 'name');
  const roleIdx = col('role', 'platformrole', 'platform_role');
  const instIdx = col('institute', 'organisation', 'organization', 'company');
  const deptIdx = col('department', 'dept', 'designation');
  if (emailIdx < 0 || nameIdx < 0 || roleIdx < 0) {
    throw new BadRequestException(
      'CSV must include email, fullName/full_name, and platformRole/role columns',
    );
  }
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line, rowIndex) => {
      const cols = splitDelimitedLine(line, delimiter);
      const email = (cols[emailIdx] ?? '').trim();
      const fullName = (cols[nameIdx] ?? '').trim();
      if (!email || !fullName) {
        throw new BadRequestException(`CSV row ${rowIndex + 2} is missing email or fullName`);
      }
      return {
        email,
        fullName,
        platformRole: parseRole(cols[roleIdx]),
        institute: instIdx >= 0 ? cols[instIdx] || undefined : undefined,
        department: deptIdx >= 0 ? cols[deptIdx] || undefined : undefined,
      };
    });
}
