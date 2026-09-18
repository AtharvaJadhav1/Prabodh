import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { writeAudit } from '../../lib/audit';
import { PrismaService } from '../../lib/prisma.service';
import { notificationQueue } from '../../lib/queue';
import { consumeToken } from '../../lib/rate-limit';
import { TeamsService } from '../teams/service';
import { broadcastSchema, commentSchema } from './schema';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  list(user: AuthUser, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(user: AuthUser, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row || row.userId !== user.id) return null;
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async broadcast(admin: AuthUser, body: z.infer<typeof broadcastSchema>) {
    await consumeToken(`broadcast:${admin.id}`, Number(process.env.BROADCAST_RATE_LIMIT_PER_MIN ?? 5));
    const recipients = await this.resolveRecipients(body.filterCriteria ?? {});
    const broadcast = await this.prisma.broadcast.create({
      data: {
        adminUserId: admin.id,
        title: body.title,
        body: body.body,
        filterCriteria: body.filterCriteria as Prisma.InputJsonValue,
        recipientCount: recipients.length,
        sentAt: new Date(),
      },
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'broadcast.send',
      entityType: 'broadcast',
      entityId: broadcast.id,
      after: { recipientCount: recipients.length, filter: body.filterCriteria },
    });
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await notificationQueue().addBulk(
        batch.map((r) => ({
          name: 'send',
          data: {
            template: 'admin_broadcast',
            recipientUserId: r.id,
            recipientEmail: r.email,
            title: body.title,
            body: body.body,
            relatedEntity: `broadcast:${broadcast.id}`,
          },
        })),
      );
      await this.prisma.notification.createMany({
        data: batch.map((r) => ({
          userId: r.id,
          type: 'broadcast' as const,
          title: body.title,
          body: body.body,
          relatedEntity: `broadcast:${broadcast.id}`,
        })),
      });
    }
    return broadcast;
  }

  private async resolveRecipients(filter: { theme?: string; institute?: string; role?: PlatformRole }) {
    if (filter.theme) {
      const teams = await this.prisma.team.findMany({
        where: { theme: filter.theme, ...(filter.institute ? { institute: filter.institute } : {}) },
        include: { members: { include: { user: true } } },
      });
      const users = teams.flatMap((t) => t.members.map((m) => m.user).filter(Boolean));
      const unique = new Map(users.map((u) => [u!.id, u!]));
      return [...unique.values()];
    }
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(filter.institute ? { institute: filter.institute } : {}),
        ...(filter.role ? { platformRole: filter.role } : {}),
      },
    });
  }

  async addComment(user: AuthUser, teamId: string, body: z.infer<typeof commentSchema>) {
    await this.teams.assertTeamAccess(user, teamId);
    const comment = await this.prisma.comment.create({
      data: {
        teamId,
        authorUserId: user.id,
        parentCommentId: body.parentCommentId,
        message: body.message,
      },
      include: { author: true },
    });
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true, mentorAssignments: { where: { active: true } } },
    });
    const notifyIds = new Set<string>();
    team?.members.forEach((m) => m.userId && notifyIds.add(m.userId));
    team?.mentorAssignments.forEach((m) => notifyIds.add(m.mentorUserId));
    notifyIds.delete(user.id);
    if (notifyIds.size) {
      await this.prisma.notification.createMany({
        data: [...notifyIds].map((id) => ({
          userId: id,
          type: 'comment' as const,
          title: 'New comment on your team',
          body: body.message.slice(0, 140),
          relatedEntity: `team:${teamId}`,
        })),
      });
    }
    return comment;
  }

  async listComments(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    return this.prisma.comment.findMany({
      where: { teamId, parentCommentId: null },
      include: { author: true, replies: { include: { author: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(user: AuthUser, teamId: string, commentId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.teamId !== teamId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorUserId !== user.id) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    await this.prisma.comment.deleteMany({ where: { parentCommentId: commentId } });
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  async applyResendEvent(providerMessageId: string, event: string, timestamp?: string) {
    const at = timestamp ? new Date(timestamp) : new Date();
    const status =
      event === 'email.delivered'
        ? 'delivered'
        : event === 'email.opened'
          ? 'opened'
          : event === 'email.bounced'
            ? 'bounced'
            : event === 'email.failed'
              ? 'failed'
              : null;
    if (!status) return null;
    return this.prisma.notificationLog.updateMany({
      where: { providerMessageId },
      data: {
        status,
        ...(status === 'delivered' ? { deliveredAt: at } : {}),
        ...(status === 'opened' ? { openedAt: at } : {}),
      },
    });
  }
}
