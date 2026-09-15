import { Body, Controller, ForbiddenException, Get, Headers, Inject, Patch, Post, RawBodyRequest, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Webhook } from 'svix';
import { CurrentUser } from '../../common/current-user.decorator';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { AuthUser } from '../../common/auth.types';
import { consumeToken } from '../../lib/rate-limit';
import { PrismaService } from '../../lib/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { IdentityService } from './service';
import { avatarUploadSchema, facultyRegisterSchema, loginSchema, otpSendSchema, otpVerifySchema, patchMeSchema, registerSchema } from './schema';

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
    const parsed = body as { email: string; password: string; portal: 'student' | 'faculty' };
    await consumeToken(`login:${parsed.email}`, Number(process.env.LOGIN_RATE_LIMIT_PER_MIN ?? 15));
    return this.identity.loginWithPassword(parsed);
  }

  @Post('auth/otp/send')
  async sendOtp(@Body(new ZodPipe(otpSendSchema)) body: unknown) {
    const parsed = body as {
      email: string;
      purpose: 'login' | 'register';
      fullName?: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    await consumeToken(`otp-send:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 5));
    return this.identity.requestOtp(parsed);
  }

  @Post('auth/otp/verify')
  async verifyOtp(@Body(new ZodPipe(otpVerifySchema)) body: unknown) {
    const parsed = body as { email: string; purpose: 'login' | 'register'; code: string };
    await consumeToken(`otp-verify:${parsed.email}`, Number(process.env.OTP_RATE_LIMIT_PER_MIN ?? 10));
    return this.identity.verifyOtpAndIssueToken(parsed);
  }

  @Post('auth/register')
  async register(@Body(new ZodPipe(registerSchema)) body: unknown) {
    const parsed = body as {
      email: string;
      password: string;
      fullName: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    return this.identity.registerWithPassword(parsed);
  }

  @Post('auth/register/faculty')
  async registerFaculty(@Body(new ZodPipe(facultyRegisterSchema)) body: unknown) {
    const parsed = body as {
      email: string;
      password: string;
      fullName: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    return this.identity.registerFacultyWithPassword(parsed);
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  patchMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(patchMeSchema)) body: unknown,
  ) {
    return this.identity.updateProfile(user.id, body as never);
  }

  @Post('me/avatar')
  @UseGuards(ClerkAuthGuard)
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(avatarUploadSchema)) body: unknown,
  ) {
    return this.identity.uploadAvatar(user.id, body as never);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    void this.identity.acceptPendingTeamInvites(user.id, user.email).catch(() => {});
    const row = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!row) return null;
    const { passwordHash: _ph, ...safe } = row;
    return safe;
  }

  @Post('webhooks/clerk')
  async clerkWebhook(
    @Req() req: RawBodyRequest<Request & { rawBody?: Buffer; body: Record<string, unknown> }>,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTs?: string,
    @Headers('svix-signature') svixSig?: string,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    const payload = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    if (secret) {
      if (!svixId || !svixTs || !svixSig) {
        throw new UnauthorizedException('Missing Svix headers');
      }
      try {
        const wh = new Webhook(secret);
        wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTs,
          'svix-signature': svixSig,
        });
      } catch {
        throw new UnauthorizedException('Invalid Clerk webhook signature');
      }
    }
    const body = typeof req.body === 'object' ? req.body : JSON.parse(payload);
    const type = String(body.type ?? '');
    const data = (body.data ?? {}) as Record<string, unknown>;
    const result = await this.identity.handleClerkEvent(type, data);
    return { ok: true, result };
  }
}
