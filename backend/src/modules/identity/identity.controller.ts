import { Body, Controller, ForbiddenException, Get, Headers, Inject, Patch, Post, RawBodyRequest, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Webhook } from 'svix';
import { CurrentUser } from '../../common/current-user.decorator';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { AuthUser } from '../../common/auth.types';
import { consumeToken } from '../../lib/rate-limit';
import { PrismaService } from '../../lib/prisma.service';
import { ZodPipe } from '../../common/zod.pipe';
import { IdentityService } from './service';
import { otpSendSchema, otpVerifySchema, registerSchema } from './schema';

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
    const user = await this.identity.loginByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Unknown or inactive account');
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      institute: user.institute,
    };
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
      fullName: string;
      institute?: string;
      department?: string;
      phone?: string;
    };
    const user = await this.identity.registerStudent(parsed);
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      institute: user.institute,
      department: user.department,
      phone: user.phone,
    };
  }

  @Patch('me')
  @UseGuards(ClerkAuthGuard)
  patchMe(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { fullName?: string; phone?: string; department?: string; institute?: string },
  ) {
    return this.identity.updateProfile(user.id, body);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    await this.identity.acceptPendingTeamInvites(user.id, user.email);
    return this.prisma.user.findUnique({ where: { id: user.id } });
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
