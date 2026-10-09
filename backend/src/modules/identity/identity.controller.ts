import { getCacheRedis } from '../../lib/queue';
import { Body, Controller, ForbiddenException, HttpException, HttpStatus, Get, Inject, Ip, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { AUTH_USER_SELECT, AuthUser } from '../../common/auth.types';
import { consumeToken } from '../../lib/rate-limit';
import { CaptchaService } from '../../lib/captcha';
import { trackFailedLogin, checkIpBlocked, clearFailedAttempts, autoBlockIpIfNeeded } from '../../lib/login-rate-limit';
import { PrismaService } from '../../lib/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { IdentityService } from './service';
import {
  avatarUploadSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  passwordForgotSchema,
  passwordResetSchema,
  passwordVerifySchema,
  patchMeSchema,
  registerSchema,
  switchRoleSchema,
  changePasswordSchema,
} from './schema';

@Controller()
export class IdentityController {
  private readonly identity: IdentityService;
  private readonly prisma: PrismaService;
  private readonly captcha: CaptchaService;

  constructor(
    @Inject(IdentityService) identity: IdentityService,
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(CaptchaService) captcha: CaptchaService,
  ) {
    this.identity = identity;
    this.prisma = prisma;
    this.captcha = captcha;
  }

  @Post('auth/dev-login')
  async devLogin(@Body() body: { email?: string }) {
    if (process.env.ALLOW_DEV_AUTH !== 'true' || process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev login is disabled');
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email) throw new UnauthorizedException('Email is required');
    return this.identity.devLoginIssueToken(email);
  }

  @Post('auth/login')
  async login(
    @Body(new ZodPipe(loginSchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as { email: string; password: string; portal?: 'student' | 'faculty'; captchaToken?: string };

    // Check if IP is blocked
    const isBlocked = await checkIpBlocked(ip);
    if (isBlocked.blocked) {
      throw new HttpException(
        {
          statusCode: 429,
          message: "Too many failed attempts. Your IP has been temporarily blocked for security reasons.",
          retryAfter: isBlocked.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    await consumeToken(`login:${parsed.email}`, Number(process.env.LOGIN_RATE_LIMIT_PER_MIN ?? 15));

    // Execute login attempt
    try {
      const result = await this.identity.loginWithPassword(parsed);
      // Clear failed attempts and lockout count on successful login
      await clearFailedAttempts(ip);
      const redis = getCacheRedis();
      await redis.del(`login:lockout_count:${ip}`);
      return result;
    } catch (err: any) {
      // Track failed login attempt
      await trackFailedLogin(ip);
      // Check if auto-block needed
      const autoBlocked = await autoBlockIpIfNeeded(ip);
      throw err;
    }
  }

  @Post('auth/otp/send')
  async sendOtp(
    @Body(new ZodPipe(otpSendSchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as {
      email: string;
      purpose: 'login' | 'register';
      fullName?: string;
      institute?: string;
      department?: string;
      phone?: string;
      captchaToken?: string;
    };
    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    await consumeToken(`otp-send:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    return this.identity.requestOtp(parsed);
  }

  @Post('auth/otp/verify')
  async verifyOtp(@Body(new ZodPipe(otpVerifySchema)) body: unknown) {
    const parsed = body as {
      email: string;
      purpose: 'login' | 'register';
      code: string;
      portal?: 'student' | 'faculty';
    };
    await consumeToken(`otp-verify:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.verifyOtpAndIssueToken(parsed);
  }

  @Post('auth/password/forgot')
  async forgotPassword(
    @Body(new ZodPipe(passwordForgotSchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as { email: string; captchaToken?: string };
    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    await consumeToken(`pwd-forgot:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    return this.identity.requestPasswordReset(parsed.email);
  }

  @Post('auth/password/verify')
  async verifyResetCode(
    @Body(new ZodPipe(passwordVerifySchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as { email: string; code: string; captchaToken?: string };
    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    await consumeToken(`pwd-verify:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.verifyPasswordResetCode(parsed);
  }

  @Post('auth/password/reset')
  async resetPassword(
    @Body(new ZodPipe(passwordResetSchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as { email: string; resetToken: string; password: string; captchaToken?: string };
    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    await consumeToken(`pwd-reset:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.resetPasswordWithOtp(parsed);
  }

  @Post('auth/register')
  async register(
    @Body(new ZodPipe(registerSchema)) body: unknown,
    @Ip() ip: string,
  ) {
    const parsed = body as {
      email: string;
      password: string;
      fullName: string;
      institute?: string;
      department?: string;
      phone?: string;
      captchaToken?: string;
    };
    await this.captcha.verifyOrThrow(parsed.captchaToken, ip);
    return this.identity.registerWithPassword(parsed);
  }

  @Post('auth/register/faculty')
  registerFaculty() {
    throw new ForbiddenException(
      'Faculty registration is disabled. Your administrator will email you login credentials.',
    );
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  patchMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(patchMeSchema)) body: unknown,
  ) {
    return this.identity.updateProfile(user.id, body as never);
  }

  @Post('me/active-role')
  @UseGuards(JwtAuthGuard)
  switchActiveRole(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(switchRoleSchema)) body: unknown,
  ) {
    const parsed = body as { role: AuthUser['platformRole'] };
    return this.identity.switchActiveRole(user.id, parsed.role);
  }

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(changePasswordSchema)) body: unknown,
  ) {
    return this.identity.changePassword(user.id, body as { currentPassword: string; newPassword: string });
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(avatarUploadSchema)) body: unknown,
  ) {
    return this.identity.uploadAvatar(user.id, body as never);
  }

  /**
   * POST rather than DELETE /users/me because the typed-confirmation phrase has to travel in
   * a body, and the frontend's apiDelete helper takes no body.
   */
  @Post('me/delete')
  @UseGuards(JwtAuthGuard)
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: { confirm?: string; successors?: Record<string, string> },
  ) {
    return this.identity.deleteOwnAccount(user, String(body?.confirm ?? ''), body?.successors);
  }

  @Get('me/delete-preview')
  @UseGuards(JwtAuthGuard)
  deletePreview(@CurrentUser() user: AuthUser) {
    return this.identity.deleteOwnAccountPreview(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() user: AuthUser,
    @Req() req: { authDbUser?: Record<string, unknown> },
  ) {
    if (req.authDbUser) return req.authDbUser;
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: AUTH_USER_SELECT,
    });
  }
}
