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
    let accessToken: string;
    try {
      accessToken = signAccessToken(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('AUTH_JWT_SECRET')) {
        throw new InternalServerErrorException(
          'Sign-in is temporarily unavailable (server auth is not configured). Contact support.',
        );
      }
      throw err;
    }
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

    if (user && user.platformRole !== targetRole) {
      throw new BadRequestException('This email is already registered with another role. Sign in instead.');
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
      this.assertPortal(user.platformRole, body.portal);
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
      if (existing.platformRole !== role) {
        throw new BadRequestException('This email is already registered with another role. Sign in instead.');
      }
      user = await this.prisma.user.update({
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
      await this.prisma.industrialMentor.upsert({
        where: { userId: user.id },
        update: {
          fullName: body.fullName,
          email,
          phone: body.phone ?? null,
          companyName: body.institute ?? null,
          designation: body.department ?? null,
          isActive: true,
        },
        create: {
          userId: user.id,
          fullName: body.fullName,
          email,
          phone: body.phone ?? null,
          companyName: body.institute ?? null,
          designation: body.department ?? null,
          isActive: true,
        },
      });
    }
    return user;
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
      PlatformRole.student_expert,
    ];
    if (!allowed.includes(body.platformRole)) {
      throw new BadRequestException(
        'Staff invite supports institute mentor, industry mentor, student expert, or admin roles only.',
      );
    }
    const email = body.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    const passwordHash = hashPassword(body.password);
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            fullName: body.fullName,
            platformRole: body.platformRole,
            institute: body.institute ?? existing.institute,
            department: body.department ?? existing.department,
            passwordHash,
            isActive: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            fullName: body.fullName,
            platformRole: body.platformRole,
            institute: body.institute,
            department: body.department,
            passwordHash,
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
    return user;
  }

  /** Upsert industrial mentor directory row; recover from email/userId unique collisions on re-import. */
  private async syncIndustrialMentorProfile(opts: {
    userId: string;
    fullName: string;
    email: string;
    companyName?: string | null;
    designation?: string | null;
  }) {
    const data = {
      fullName: opts.fullName,
      email: opts.email,
      companyName: opts.companyName ?? null,
      designation: opts.designation ?? null,
      isActive: true,
    };

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
      data: { userId: opts.userId, ...data },
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
        const user = existing
          ? await this.prisma.user.update({
              where: { id: existing.id },
              data: {
                fullName: row.fullName,
                platformRole: row.platformRole,
                institute: row.institute ?? existing.institute,
                department: row.department ?? existing.department,
                isActive: true,
                ...(row.password ? { passwordHash: hashPassword(row.password) } : {}),
              },
            })
          : await this.prisma.user.create({
              data: {
                email,
                fullName: row.fullName,
                platformRole: row.platformRole,
                institute: row.institute,
                department: row.department,
                ...(row.password ? { passwordHash: hashPassword(row.password) } : {}),
              },
            });

        // Keep Industrial Mentors directory in sync for CSV + manual bulk imports.
        if (row.platformRole === PlatformRole.industry_mentor) {
          await this.syncIndustrialMentorProfile({
            userId: user.id,
            fullName: row.fullName,
            email,
            companyName: row.institute,
            designation: row.department,
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
