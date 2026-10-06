import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, PlatformRole, Prisma, TeamStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { writeAudit } from '../../lib/audit';
import { PrismaService } from '../../lib/prisma.service';
import { notificationQueue } from '../../lib/queue';
import { consumeToken } from '../../lib/rate-limit';
import { hasAnyRole } from '../../lib/roles';
import {
  friendActionState,
  inviteActionState,
  isActionKind,
  joinRequestActionState,
  NotificationActionKind,
  NotificationActionState,
  rolesAllowedFor,
  stateForDecision,
} from '../../lib/notification-actions';
import { acceptedOthers } from '../../lib/self-delete-rules';
import { isTeamFrozen } from '../../lib/team-rules';
import { ChatService } from '../chat/chat.service';
import { MentorsService } from '../mentors/service';
import { TeamsService } from '../teams/service';
import { broadcastSchema, commentSchema, notificationActionSchema } from './schema';

const NOTIFICATION_SELECT = {
  id: true,
  userId: true,
  type: true,
  title: true,
  body: true,
  readAt: true,
  relatedEntity: true,
  actionKind: true,
  actionRef: true,
  createdAt: true,
  updatedAt: true,
} as const;

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof NOTIFICATION_SELECT }>;

export type ActionMeta = {
  teamId?: string;
  teamName?: string;
  fromName?: string;
  needsTeamSwitch?: boolean;
} | null;

export type NotificationView = NotificationRow & {
  actionState: NotificationActionState | null;
  actionMeta: ActionMeta;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
    private readonly mentors: MentorsService,
    private readonly chat: ChatService,
  ) {}

  async list(user: AuthUser, unreadOnly = false, since?: string): Promise<NotificationView[]> {
    let sinceDate: Date | null = null;
    if (since) {
      sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) throw new BadRequestException('Invalid "since" timestamp');
    }
    const rows = await this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { readAt: null } : {}),
        ...(sinceDate
          ? {
              OR: [
                { createdAt: { gt: sinceDate } },
                { actionKind: { not: null }, updatedAt: { gt: sinceDate } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: NOTIFICATION_SELECT,
    });
    return this.hydrate(user, rows);
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    // Single ownership-scoped update; return the row only when it existed.
    const readAt = new Date();
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt },
    });
    if (!updated.count) return null;
    return this.loadView(user, id);
  }

  private async loadView(user: AuthUser, id: string): Promise<NotificationView | null> {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId: user.id },
      select: NOTIFICATION_SELECT,
    });
    if (!row) return null;
    return (await this.hydrate(user, [row]))[0];
  }

  /**
   * Adds `actionState` / `actionMeta` derived from the CURRENT state of the underlying entity.
   * One batched `findMany ... in` per action kind (no N+1).
   */
  private async hydrate(user: AuthUser, rows: NotificationRow[]): Promise<NotificationView[]> {
    const refs: Record<NotificationActionKind, string[]> = {
      team_invite: [],
      mentor_invite: [],
      friend_request: [],
      join_request: [],
    };
    for (const r of rows) {
      if (isActionKind(r.actionKind) && r.actionRef) refs[r.actionKind].push(r.actionRef);
    }
    const uniq = (xs: string[]) => [...new Set(xs)];
    const [teamInvites, mentorInvites, friendships, joinRequests, currentTeam] = await Promise.all([
      refs.team_invite.length
        ? this.prisma.teamMember.findMany({
            where: { id: { in: uniq(refs.team_invite) } },
            select: {
              id: true,
              inviteStatus: true,
              team: { select: { id: true, name: true, status: true, leader: { select: { fullName: true } } } },
            },
          })
        : [],
      refs.mentor_invite.length
        ? this.prisma.mentorInvite.findMany({
            where: { id: { in: uniq(refs.mentor_invite) } },
            select: {
              id: true,
              inviteStatus: true,
              team: { select: { id: true, name: true, status: true } },
              invitedBy: { select: { fullName: true } },
            },
          })
        : [],
      refs.friend_request.length
        ? this.prisma.friendship.findMany({
            where: { id: { in: uniq(refs.friend_request) } },
            select: { id: true, status: true, requester: { select: { fullName: true } } },
          })
        : [],
      refs.join_request.length
        ? this.prisma.joinRequest.findMany({
            where: { id: { in: uniq(refs.join_request) } },
            select: {
              id: true,
              status: true,
              student: { select: { fullName: true } },
              team: { select: { id: true, name: true, status: true } },
            },
          })
        : [],
      // Only needed to tell the client whether accepting would move the student off their team.
      refs.team_invite.length ? this.currentTeamOf(user.id) : null,
    ]);
    const ti = new Map(teamInvites.map((x) => [x.id, x]));
    const mi = new Map(mentorInvites.map((x) => [x.id, x]));
    const fr = new Map(friendships.map((x) => [x.id, x]));
    const jr = new Map(joinRequests.map((x) => [x.id, x]));

    return rows.map((r): NotificationView => {
      const kind = r.actionKind;
      if (!isActionKind(kind) || !r.actionRef) return { ...r, actionState: null, actionMeta: null };
      switch (kind) {
        case 'team_invite': {
          const x = ti.get(r.actionRef);
          const state = inviteActionState(x?.inviteStatus, { frozen: x ? isTeamFrozen(x.team.status) : false });
          return {
            ...r,
            actionState: state,
            actionMeta: x
              ? {
                  teamId: x.team.id,
                  teamName: x.team.name,
                  fromName: x.team.leader?.fullName,
                  needsTeamSwitch: state === 'pending' ? !!currentTeam : false,
                }
              : null,
          };
        }
        case 'mentor_invite': {
          const x = mi.get(r.actionRef);
          return {
            ...r,
            actionState: inviteActionState(x?.inviteStatus, { frozen: x ? isTeamFrozen(x.team.status) : false }),
            actionMeta: x ? { teamId: x.team.id, teamName: x.team.name, fromName: x.invitedBy.fullName } : null,
          };
        }
        case 'friend_request': {
          const x = fr.get(r.actionRef);
          return {
            ...r,
            actionState: friendActionState(x?.status),
            actionMeta: x ? { fromName: x.requester.fullName } : null,
          };
        }
        case 'join_request': {
          const x = jr.get(r.actionRef);
          return {
            ...r,
            actionState: joinRequestActionState(x?.status, { frozen: x ? isTeamFrozen(x.team.status) : false }),
            actionMeta: x ? { teamId: x.team.id, teamName: x.team.name, fromName: x.student.fullName } : null,
          };
        }
      }
    });
  }

  /** Same definition of "current team" the switch-team flow uses. */
  private currentTeamOf(userId: string) {
    return this.prisma.team.findFirst({
      where: {
        status: { not: TeamStatus.disqualified },
        OR: [
          { leaderUserId: userId },
          { members: { some: { userId, inviteStatus: InviteStatus.accepted } } },
        ],
      },
      select: {
        id: true,
        name: true,
        leaderUserId: true,
        members: { select: { userId: true, inviteStatus: true } },
      },
    });
  }

  /**
   * Accept/decline the request behind an actionable notification. Dispatches to the very same
   * service methods the regular UI calls (with the caller as actor), so every authorization,
   * validation, audit and side-effect rule of those services still applies.
   */
  async act(user: AuthUser, id: string, body: z.infer<typeof notificationActionSchema>) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId: user.id },
      select: NOTIFICATION_SELECT,
    });
    if (!n) throw new NotFoundException('Notification not found');
    if (!isActionKind(n.actionKind) || !n.actionRef) {
      throw new BadRequestException('This notification has no action');
    }
    const kind = n.actionKind;
    const ref = n.actionRef;
    const accept = body.decision === 'accept';

    const allowed = rolesAllowedFor(kind);
    if (allowed && !hasAnyRole(user, allowed)) throw new ForbiddenException('Insufficient role');

    const handled = async (state: NotificationActionState, message?: string): Promise<never> => {
      const notification = await this.loadView(user, id);
      throw new ConflictException({
        code: 'ALREADY_HANDLED',
        actionState: state,
        message: message ?? this.handledMessage(state),
        notification,
      });
    };

    // Fast pre-check against the current state; the services' own guards stay authoritative (race-safe).
    const current = (await this.hydrate(user, [n]))[0];
    if (current.actionState && current.actionState !== 'pending') await handled(current.actionState);

    let outcomeExpired = false;
    try {
      switch (kind) {
        case 'team_invite': {
          if (!accept) {
            await this.teams.declineInvite(user, ref);
            break;
          }
          const team = await this.currentTeamOf(user.id);
          const teamId = current.actionMeta?.teamId;
          if (team) {
            if (!body.confirmSwitch) {
              throw new ConflictException({
                code: 'NEEDS_CONFIRMATION',
                reason: 'team_switch',
                message: `Accepting this invitation will move you out of ${team.name}. Confirm to switch teams.`,
                teamId,
                currentTeamId: team.id,
                currentTeamName: team.name,
              });
            }
            if (team.leaderUserId === user.id && acceptedOthers(team.members, user.id) > 0) {
              // A lead with teammates must name a successor first; that choice lives in Group Requests.
              throw new ConflictException({
                code: 'NEEDS_CONFIRMATION',
                reason: 'team_switch',
                message: `You lead ${team.name}. Choose a new Team Lead from Group Requests before switching teams.`,
                teamId,
                currentTeamId: team.id,
                currentTeamName: team.name,
                requiresSuccessor: true,
              });
            }
            await this.teams.switchTeams(user, ref);
          } else {
            await this.teams.acceptInvite(user, ref);
          }
          break;
        }
        case 'mentor_invite': {
          const result = await this.mentors.respondToInvite(user, ref, accept);
          if (accept && result && (result as { accepted?: boolean }).accepted === false) outcomeExpired = true;
          break;
        }
        case 'friend_request':
          if (accept) await this.chat.acceptRequest(user, ref);
          else await this.chat.declineRequest(user, ref);
          break;
        case 'join_request':
          if (accept) await this.teams.acceptJoinRequest(user, ref);
          else await this.teams.rejectJoinRequest(user, ref);
          break;
      }
    } catch (err) {
      if (err instanceof HttpException) {
        const resp = err.getResponse();
        if (typeof resp === 'object' && resp && (resp as { code?: string }).code === 'NEEDS_CONFIRMATION') throw err;
        // Lost a race / became stale: report the real current state instead of a generic 400/404/409.
        const fresh = (await this.hydrate(user, [n]))[0];
        if (fresh.actionState && fresh.actionState !== 'pending') await handled(fresh.actionState);
      }
      throw err;
    }
    if (outcomeExpired) await handled('expired', 'This invitation can no longer be accepted.');

    await this.prisma.notification.updateMany({
      where: { userId: user.id, actionKind: kind, actionRef: ref, readAt: null },
      data: { readAt: new Date() },
    });
    const state = stateForDecision(body.decision);
    return {
      ok: true,
      actionState: state,
      message: this.doneMessage(kind, accept),
      notification: await this.loadView(user, id),
    };
  }

  private handledMessage(state: NotificationActionState) {
    switch (state) {
      case 'accepted':
        return 'This request was already accepted.';
      case 'declined':
        return 'This request was already declined or withdrawn.';
      default:
        return 'This request is no longer available.';
    }
  }

  private doneMessage(kind: NotificationActionKind, accept: boolean) {
    const m: Record<NotificationActionKind, [string, string]> = {
      team_invite: ['You joined the team.', 'Invitation declined.'],
      mentor_invite: ['Mentor invitation accepted.', 'Mentor invitation declined.'],
      friend_request: ['Friend request accepted.', 'Friend request declined.'],
      join_request: ['Join request approved.', 'Join request declined.'],
    };
    return m[kind][accept ? 0 : 1];
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

  private readonly recipientSelect = { id: true, email: true } as const;
  private readonly authorSelect = {
    id: true,
    fullName: true,
    email: true,
    platformRole: true,
  } as const;

  private async resolveRecipients(filter: { theme?: string; institute?: string; role?: PlatformRole }) {
    if (filter.theme) {
      const teams = await this.prisma.team.findMany({
        where: { theme: filter.theme, ...(filter.institute ? { institute: filter.institute } : {}) },
        select: {
          members: {
            select: { user: { select: this.recipientSelect } },
          },
        },
      });
      const users = teams.flatMap((t) => t.members.map((m) => m.user).filter(Boolean));
      const unique = new Map(users.map((u) => [u!.id, u!]));
      return [...unique.values()];
    }
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(filter.institute ? { institute: filter.institute } : {}),
        // Dual-role accounts match broadcasts for ANY held role.
        ...(filter.role
          ? { OR: [{ platformRole: filter.role }, { additionalRoles: { has: filter.role } }] }
          : {}),
      },
      select: this.recipientSelect,
    });
  }

  async addComment(user: AuthUser, teamId: string, body: z.infer<typeof commentSchema>) {
    this.teams.assertTeamMutable(await this.teams.assertTeamAccess(user, teamId));
    const comment = await this.prisma.comment.create({
      data: {
        teamId,
        authorUserId: user.id,
        parentCommentId: body.parentCommentId,
        message: body.message,
      },
      include: { author: { select: this.authorSelect } },
    });
    // Notifications are not needed for the sender's response — fan out in the background.
    void this.notifyCommentRecipients(user.id, teamId, body.message).catch((err) => {
      console.error('[comments] notification fan-out failed', err);
    });
    return comment;
  }

  private async notifyCommentRecipients(authorId: string, teamId: string, message: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        members: { select: { userId: true } },
        mentorAssignments: { where: { active: true }, select: { mentorUserId: true } },
      },
    });
    const notifyIds = new Set<string>();
    team?.members.forEach((m) => m.userId && notifyIds.add(m.userId));
    team?.mentorAssignments.forEach((m) => notifyIds.add(m.mentorUserId));
    notifyIds.delete(authorId);
    if (!notifyIds.size) return;
    await this.prisma.notification.createMany({
      data: [...notifyIds].map((id) => ({
        userId: id,
        type: 'comment' as const,
        title: 'New comment on your team',
        body: message.slice(0, 140),
        relatedEntity: `team:${teamId}`,
      })),
    });
  }

  async listComments(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    return this.prisma.comment.findMany({
      where: { teamId, parentCommentId: null },
      include: {
        author: { select: this.authorSelect },
        replies: { include: { author: { select: this.authorSelect } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteComment(user: AuthUser, teamId: string, commentId: string) {
    this.teams.assertTeamMutable(await this.teams.assertTeamAccess(user, teamId));
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
