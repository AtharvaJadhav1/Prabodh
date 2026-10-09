import { Body, Controller, ForbiddenException, Get, Inject, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { AUTH_USER_SELECT, AuthUser } from '../../common/auth.types';
import { consumeToken, consumeOtpDispatchQuota, getClientIp } from '../../lib/rate-limit';
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

  constructor(
    @Inject(IdentityService) identity: IdentityService,
    @Inject(PrismaService) prisma: PrismaService,
  ) {
    this.identity = identity;
    this.prisma = prisma;
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
  async login(@Body(new ZodPipe(loginSchema)) body: unknown) {
    const parsed = body as { email: string; password: string; portal?: 'student' | 'faculty' };
    await consumeToken(`login:${parsed.email}`, Number(process.env.LOGIN_RATE_LIMIT_PER_MIN ?? 15));
    return this.identity.loginWithPassword(parsed);
  }

  @Post('auth/otp/send')
  async sendOtp(@Req() req: unknown, @Body(new ZodPipe(otpSendSchema)) body: unknown) {
    const parsed = body as {
      email: string;
      purpose: 'login' | 'register';
      fullName?: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    await consumeToken(`otp-send:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    await consumeOtpDispatchQuota({ email: parsed.email, ip: getClientIp(req) });
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
  async forgotPassword(@Req() req: unknown, @Body(new ZodPipe(passwordForgotSchema)) body: unknown) {
    const parsed = body as { email: string };
    await consumeToken(`pwd-forgot:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    await consumeOtpDispatchQuota({ email: parsed.email, ip: getClientIp(req) });
    return this.identity.requestPasswordReset(parsed.email);
  }

  @Post('auth/password/verify')
  async verifyResetCode(@Body(new ZodPipe(passwordVerifySchema)) body: unknown) {
    const parsed = body as { email: string; code: string };
    await consumeToken(`pwd-verify:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.verifyPasswordResetCode(parsed);
  }

  @Post('auth/password/reset')
  async resetPassword(@Body(new ZodPipe(passwordResetSchema)) body: unknown) {
    const parsed = body as { email: string; resetToken: string; password: string };
    await consumeToken(`pwd-reset:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.resetPasswordWithOtp(parsed);
  }

  @Post('auth/register')
  async register(@Req() req: unknown, @Body(new ZodPipe(registerSchema)) body: unknown) {
    const parsed = body as {
      email: string;
      password: string;
      fullName: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    await consumeToken(`register:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    await consumeOtpDispatchQuota({ email: parsed.email, ip: getClientIp(req) });
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
