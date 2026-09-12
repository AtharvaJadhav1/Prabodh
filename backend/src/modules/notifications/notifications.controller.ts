import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, RawBodyRequest, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { Webhook } from 'svix';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { broadcastSchema, commentSchema } from './schema';
import { NotificationsService } from './service';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @UseGuards(ClerkAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.notifications.list(user, unread === 'true');
  }

  @Patch('notifications/:id/read')
  @UseGuards(ClerkAuthGuard)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post('broadcasts')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(PlatformRole.admin)
  broadcast(@CurrentUser() user: AuthUser, @Body(new ZodPipe(broadcastSchema)) body: unknown) {
    return this.notifications.broadcast(user, body as never);
  }

  @Post('teams/:teamId/comments')
  @UseGuards(ClerkAuthGuard)
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(commentSchema)) body: unknown,
  ) {
    return this.notifications.addComment(user, teamId, body as never);
  }

  @Get('teams/:teamId/comments')
  @UseGuards(ClerkAuthGuard)
  listComments(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.notifications.listComments(user, teamId);
  }

  @Delete('teams/:teamId/comments/:commentId')
  @UseGuards(ClerkAuthGuard)
  deleteComment(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.notifications.deleteComment(user, teamId, commentId);
  }

  @Post('webhooks/resend')
  async resendWebhook(
    @Req() req: RawBodyRequest<{ rawBody?: Buffer; body: Record<string, unknown> }>,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTs?: string,
    @Headers('svix-signature') svixSig?: string,
  ) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const payload = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    if (secret) {
      if (!svixId || !svixTs || !svixSig) throw new UnauthorizedException('Missing Svix headers');
      try {
        new Webhook(secret).verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTs,
          'svix-signature': svixSig,
        });
      } catch {
        throw new UnauthorizedException('Invalid Resend webhook signature');
      }
    }
    const body = typeof req.body === 'object' ? req.body : JSON.parse(payload);
    const type = String(body.type ?? '');
    const data = (body.data ?? {}) as Record<string, unknown>;
    const emailId = String(data.email_id ?? data.id ?? '');
    if (emailId) await this.notifications.applyResendEvent(emailId, type, String(body.created_at ?? ''));
    return { ok: true };
  }
}
