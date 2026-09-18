import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, JoinRequestStatus, NotificationType, Prisma, TeamStatus } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { writeAudit } from '../../lib/audit';
import { getClerkClient } from '../../lib/clerk';
import { createNotifications, notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { sendTeamMemberInviteEmail } from '../../lib/invite-email';
import { consumeToken } from '../../lib/rate-limit';
import { getSettingNumber } from '../../lib/settings';
import { generateTeamCode, TeamsRepository } from './repository';
import { createTeamSchema, inviteSchema, patchTeamSchema } from './schema';
import { z } from 'zod';

const MAX_TEAM_CODE_ATTEMPTS = 3;

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly repo: TeamsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(user: AuthUser, body: z.infer<typeof createTeamSchema>) {
    if (user.platformRole !== 'student') {
      throw new ForbiddenException('Only students can create teams');
    }

    const existing = await this.prisma.team.findFirst({
      where: {
        OR: [
          { leaderUserId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('You are already part of a team');
    }

    try {
      const defaultCap = await getSettingNumber(this.prisma, 'member_cap');

      for (let attempt = 1; attempt <= MAX_TEAM_CODE_ATTEMPTS; attempt++) {
        const teamCode = await generateTeamCode(this.prisma);
        const clerk = getClerkClient();
        let clerkOrgId = `local-org-${teamCode}`;
        if (clerk) {
          try {
            const org = await clerk.organizations.createOrganization({
              name: body.name,
              createdBy: user.clerkUserId,
            });
            clerkOrgId = org.id;
            try {
              await clerk.organizations.updateOrganizationMembership({
                organizationId: org.id,
                userId: user.clerkUserId,
                role: 'org:admin',
              });
            } catch {
              // createdBy is already org admin in most Clerk configs
            }
          } catch {
            // Keep a local org id so team creation still works if Clerk orgs are unavailable.
          }
        }

        try {
          return await this.repo.create({
            clerkOrgId,
            teamCode,
            name: body.name,
            institute: body.institute,
            theme: body.theme,
            memberCap: body.memberCap ?? defaultCap,
            status: TeamStatus.forming,
            leader: { connect: { id: user.id } },
            members: {
              create: {
                userId: user.id,
                invitedEmail: user.email,
                inviteStatus: InviteStatus.accepted,
                joinedAt: new Date(),
              },
            },
          });
        } catch (err) {
          const isTeamCodeCollision =
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002' &&
            (err.meta?.target as string[] | undefined)?.includes('team_code');
          if (isTeamCodeCollision && attempt < MAX_TEAM_CODE_ATTEMPTS) {
            this.logger.warn(`Team code collision on "${teamCode}", retrying (attempt ${attempt})`);
            continue;
          }
          throw err;
        }
      }
      throw new InternalServerErrorException('Could not allocate a unique team code, please try again');
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof InternalServerErrorException) {
        throw err;
      }
      this.logger.error(
        `Failed to create team for user ${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException('Failed to create team');
    }
  }

  async getCurrentForUser(user: AuthUser) {
    const team = await this.repo.findCurrentForUser(user.id);
    if (!team) return null;
    await this.assertCanView(user, team);
    return team;
  }

  async get(user: AuthUser, teamId: string, view: 'dashboard' | 'full' = 'dashboard') {
    const team =
      view === 'full' ? await this.repo.findById(teamId) : await this.repo.findByIdDashboard(teamId);
    if (!team) throw new NotFoundException('Team not found');
    await this.assertCanView(user, team);
    return team;
  }

  async listDeliverables(user: AuthUser, teamId: string) {
    await this.assertTeamAccess(user, teamId);
    return this.repo.listDeliverables(teamId);
  }

  async listForUser(user: AuthUser, page: number, limit: number) {
    if (user.platformRole === 'admin') {
      return this.list(page, limit);
    }
    if (user.platformRole === 'institute_mentor' || user.platformRole === 'industry_mentor') {
      const assignments = await this.prisma.mentorAssignment.findMany({
        where: { mentorUserId: user.id, active: true },
        include: { team: { include: { leader: true, problemStatement: true } } },
      });
      const items = assignments.map((a) => a.team);
      return { items, total: items.length, page: 1, limit: items.length || 1, pages: 1 };
    }
    const items = await this.repo.listMine(user.id);
    return { items, total: items.length, page: 1, limit: items.length || 1, pages: 1 };
  }

  async list(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.repo.list((page - 1) * limit, limit),
      this.repo.count(),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async patch(user: AuthUser, teamId: string, body: z.infer<typeof patchTeamSchema>) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can edit details');
    }
    if (team.status === TeamStatus.locked || team.detailsLockAt) {
      throw new ForbiddenException('Team details are locked');
    }
    return this.repo.update(teamId, body);
  }

  async invite(user: AuthUser, teamId: string, body: z.infer<typeof inviteSchema>) {
    await consumeToken(`invite:${user.id}`, Number(process.env.INVITE_RATE_LIMIT_PER_MIN ?? 10));
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id) {
      throw new ForbiddenException('Only the team leader can invite members');
    }
    const email = body.email.toLowerCase();
    const existing = await this.repo.findMemberByEmail(teamId, email);
    if (existing && existing.inviteStatus !== InviteStatus.revoked && existing.inviteStatus !== InviteStatus.expired) {
      throw new BadRequestException('This email is already invited');
    }
    const count = await this.repo.countActiveMembers(teamId);
    if (count >= team.memberCap) {
      throw new BadRequestException(`Team is at member cap (${team.memberCap})`);
    }

    const member =
      existing && (existing.inviteStatus === InviteStatus.revoked || existing.inviteStatus === InviteStatus.expired)
        ? await this.prisma.teamMember.update({
            where: { id: existing.id },
            data: { inviteStatus: InviteStatus.pending },
          })
        : await this.repo.addMember({
            team: { connect: { id: teamId } },
            invitedEmail: email,
            inviteStatus: InviteStatus.pending,
          });

    // Clerk + Resend stay off the request critical path so invite/revoke buttons stay snappy.
    const clerk = getClerkClient();
    if (clerk && !team.clerkOrgId.startsWith('local-org-')) {
      void clerk.organizations
        .createOrganizationInvitation({
          organizationId: team.clerkOrgId,
          emailAddress: email,
          role: 'org:member',
          inviterUserId: user.clerkUserId,
        })
        .then((invitation) =>
          this.prisma.teamMember.update({
            where: { id: member.id },
            data: { clerkInvitationId: invitation.id },
          }),
        )
        .catch(() => undefined);
    }

    void sendTeamMemberInviteEmail({
      to: email,
      teamName: team.name,
      teamCode: team.teamCode,
      leaderName: user.fullName,
    }).catch((err) => {
      console.error('[teams.invite] email delivery failed for', email, err);
    });

    // In-app notification for the invitee so their bell + Group Requests badge light up.
    // Non-registered invitees only get the email — there is no account to notify yet.
    void (async () => {
      const invitee = await this.prisma.user.findUnique({ where: { email } });
      if (!invitee) return;
      await createNotifications(this.prisma, [invitee.id], {
        type: NotificationType.team_join_request,
        title: "You've been invited to join a team",
        body: `${team.name} (${team.teamCode}) invited you to join their squad. Open Group Requests to accept or decline.`,
        relatedEntity: team.id,
      });
    })().catch((err) => console.error('[teams.invite] notify invitee failed', err));

    return { ...member, emailSent: true, emailError: null };
  }

  async removeMember(user: AuthUser, teamId: string, memberId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can remove members');
    }
    const member = await this.prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId === team.leaderUserId) {
      throw new BadRequestException('Cannot remove the team leader');
    }
    if (member.inviteStatus === InviteStatus.pending) {
      return this.prisma.teamMember.update({
        where: { id: memberId },
        data: { inviteStatus: InviteStatus.revoked },
      });
    }
    return this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  async revokeInvite(user: AuthUser, teamId: string, memberId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can revoke invites');
    }
    const member = await this.prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('Invite not found');
    if (member.inviteStatus === InviteStatus.accepted) {
      throw new BadRequestException('Cannot revoke an accepted member; remove them separately');
    }
    const clerk = getClerkClient();
    if (clerk && member.clerkInvitationId && !team.clerkOrgId.startsWith('local-org-')) {
      try {
        await clerk.organizations.revokeOrganizationInvitation({
          organizationId: team.clerkOrgId,
          invitationId: member.clerkInvitationId,
        });
      } catch {
        // invitation may already be expired in Clerk
      }
    }
    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { inviteStatus: InviteStatus.revoked },
    });
  }

  async expireStaleInvites() {
    const hours = await getSettingNumber(this.prisma, 'invite_ttl_hours');
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    const res = await this.prisma.teamMember.updateMany({
      where: { inviteStatus: InviteStatus.pending, createdAt: { lte: cutoff } },
      data: { inviteStatus: InviteStatus.expired },
    });
    return { expired: res.count };
  }

  /** Student-facing: all invites dispatched to this account that are still awaiting acceptance. */
  async myPendingInvites(user: AuthUser) {
    const email = user.email.trim().toLowerCase();
    const items = await this.prisma.teamMember.findMany({
      where: {
        OR: [{ invitedEmail: email }, { userId: user.id }],
        inviteStatus: InviteStatus.pending,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            teamCode: true,
            leader: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    return { items, total: items.length };
  }

  /** Student accepts a team invite sent to their email. Only one team membership is allowed. */
  async acceptInvite(user: AuthUser, inviteId: string) {
    const invite = await this.prisma.teamMember.findUnique({
      where: { id: inviteId },
      include: {
        team: { select: { id: true, name: true, leaderUserId: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.inviteStatus !== InviteStatus.pending) {
      throw new BadRequestException('This invite is no longer pending');
    }
    if (invite.userId !== user.id && invite.invitedEmail !== user.email.trim().toLowerCase()) {
      throw new ForbiddenException('This invite was not dispatched to your account');
    }

    const existingTeam = await this.findUserTeam(user.id);
    if (existingTeam) {
      throw new ConflictException('You are already part of a team');
    }

    const member = await this.prisma.teamMember.update({
      where: { id: invite.id },
      data: { inviteStatus: InviteStatus.accepted, userId: user.id, joinedAt: new Date() },
    });
    void notifyUsers(
      this.prisma,
      [user.id],
      {
        type: NotificationType.team_join_request,
        title: 'Team invitation accepted',
        body: 'You joined the team as a member.',
        relatedEntity: invite.teamId,
        template: 'join_request_outcome',
      },
    ).catch((err) => console.error('[teams.acceptInvite] notify student failed', err));
    if (invite.team.leaderUserId) {
      void createNotifications(this.prisma, [invite.team.leaderUserId], {
        type: NotificationType.team_join_request,
        title: 'Invite accepted',
        body: `${user.fullName} accepted your invite and joined ${invite.team.name}.`,
        relatedEntity: invite.team.id,
      }).catch((err) => console.error('[teams.acceptInvite] notify leader failed', err));
    }
    return member;
  }

  /** Student declines a team invite sent to their email. */
  async declineInvite(user: AuthUser, inviteId: string) {
    const invite = await this.prisma.teamMember.findUnique({
      where: { id: inviteId },
      include: {
        team: { select: { id: true, name: true, leaderUserId: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.inviteStatus !== InviteStatus.pending) {
      throw new BadRequestException('This invite is no longer pending');
    }
    if (invite.userId !== user.id && invite.invitedEmail !== user.email.trim().toLowerCase()) {
      throw new ForbiddenException('This invite was not dispatched to your account');
    }

    await this.prisma.teamMember.update({
      where: { id: invite.id },
      data: { inviteStatus: InviteStatus.revoked },
    });
    if (invite.team.leaderUserId) {
      void createNotifications(this.prisma, [invite.team.leaderUserId], {
        type: NotificationType.team_join_request,
        title: 'Invite declined',
        body: `${user.fullName} declined your invite to join ${invite.team.name}.`,
        relatedEntity: invite.team.id,
      }).catch((err) => console.error('[teams.declineInvite] notify leader failed', err));
    }
    return { declined: true };
  }

  /** Student asks to join a team. Lead then accepts or rejects from their Requests tab. */
  async createJoinRequest(user: AuthUser, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, leaderUserId: true, memberCap: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    const alreadyInTeam = await this.findUserTeam(user.id);
    if (alreadyInTeam) {
      throw new ConflictException('You are already part of a team');
    }
    const existing = await this.prisma.joinRequest.findFirst({
      where: { studentId: user.id, teamId },
    });
    if (existing) {
      if (existing.status === JoinRequestStatus.pending) {
        throw new ConflictException('You already have a pending request for this team');
      }
      if (existing.status === JoinRequestStatus.accepted) {
        throw new ConflictException('Your request for this team was already accepted');
      }
    }

    const count = await this.prisma.teamMember.count({
      where: { teamId, inviteStatus: { in: [InviteStatus.pending, InviteStatus.accepted] } },
    });
    if (count >= team.memberCap) {
      throw new BadRequestException(`Team is at member cap (${team.memberCap})`);
    }

    const request =
      existing && existing.status === JoinRequestStatus.rejected
        ? await this.prisma.joinRequest.update({
            where: { id: existing.id },
            data: { status: JoinRequestStatus.pending, respondedAt: null },
          })
        : await this.prisma.joinRequest.create({
            data: { studentId: user.id, teamId },
          });

    void notifyUsers(
      this.prisma,
      [team.leaderUserId],
      {
        type: NotificationType.team_join_request,
        title: 'New request to join your team',
        body: `${user.fullName} has requested to join ${team.name}. Review it in your Group Requests tab.`,
        relatedEntity: team.id,
        template: 'join_request',
      },
    ).catch((err) => console.error('[teams.createJoinRequest] notify leader failed', err));

    return { ...request, memberCount: count };
  }

  /** Pending join requests awaiting the leader's decision. */
  async listJoinRequests(user: AuthUser, teamId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can see join requests');
    }
    return this.prisma.joinRequest.findMany({
      where: { teamId, status: JoinRequestStatus.pending },
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            institute: true,
            department: true,
            domainTags: true,
          },
        },
      },
    });
  }

  /** Leader accepts a pending request: places the student on the team atomically. */
  async acceptJoinRequest(user: AuthUser, requestId: string) {
    const request = await this.prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    });
    if (!request || request.status !== JoinRequestStatus.pending) {
      throw new NotFoundException('Pending join request not found');
    }
    const team = await this.prisma.team.findUnique({
      where: { id: request.teamId },
      select: { id: true, name: true, leaderUserId: true, memberCap: true, clerkOrgId: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can accept join requests');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const verified = await tx.team.findUnique({
        where: { id: team.id },
        select: { id: true, leaderUserId: true, memberCap: true },
      });
      if (!verified) throw new NotFoundException('Team not found');
      if (verified.leaderUserId !== user.id && user.platformRole !== 'admin') {
        throw new ForbiddenException('Only the team leader can accept join requests');
      }

      const alreadyPlaced = await tx.team.findFirst({
        where: {
          AND: [
            { id: { not: team.id } },
            {
              OR: [
                { leaderUserId: request.studentId },
                { members: { some: { userId: request.studentId, inviteStatus: InviteStatus.accepted } } },
              ],
            },
          ],
        },
      });
      if (alreadyPlaced) {
        throw new ConflictException('This student has already joined another team');
      }

      const count = await tx.teamMember.count({
        where: { teamId: team.id, inviteStatus: { in: [InviteStatus.pending, InviteStatus.accepted] } },
      });
      if (count >= verified.memberCap) {
        throw new BadRequestException(`Team is at member cap (${verified.memberCap})`);
      }

      const email = request.student.email.toLowerCase();
      const placed = await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: request.studentId,
          invitedEmail: email,
          inviteStatus: InviteStatus.accepted,
          joinedAt: new Date(),
        },
      });

      await tx.joinRequest.update({
        where: { id: request.id },
        data: { status: JoinRequestStatus.accepted, respondedAt: new Date() },
      });
      await tx.joinRequest.updateMany({
        where: {
          studentId: request.studentId,
          status: JoinRequestStatus.pending,
          teamId: { not: team.id },
        },
        data: { status: JoinRequestStatus.rejected, respondedAt: new Date() },
      });
      const remaining = await tx.teamMember.count({
        where: { teamId: team.id, inviteStatus: { in: [InviteStatus.pending, InviteStatus.accepted] } },
      });
      if (remaining >= verified.memberCap) {
        await tx.joinRequest.updateMany({
          where: { teamId: team.id, status: JoinRequestStatus.pending },
          data: { status: JoinRequestStatus.rejected, respondedAt: new Date() },
        });
      }
      return placed;
    });

    void notifyUsers(
      this.prisma,
      [request.studentId],
      {
        type: NotificationType.team_join_request,
        title: 'Join request accepted',
        body: `${team.name} accepted your request to join the team.`,
        relatedEntity: team.id,
        template: 'join_request_outcome',
      },
    ).catch((err) => console.error('[teams.acceptJoinRequest] notify student failed', err));

    return {
      ...member,
      memberCount: await this.prisma.teamMember.count({
        where: {
          teamId: team.id,
          inviteStatus: { in: [InviteStatus.pending, InviteStatus.accepted] },
        },
      }),
    };
  }

  /** Leader rejects a pending request. */
  async rejectJoinRequest(user: AuthUser, requestId: string) {
    const request = await this.prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    });
    if (!request || request.status !== JoinRequestStatus.pending) {
      throw new NotFoundException('Pending join request not found');
    }
    const team = await this.prisma.team.findUnique({
      where: { id: request.teamId },
      select: { id: true, name: true, leaderUserId: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can reject join requests');
    }

    const updated = await this.prisma.joinRequest.update({
      where: { id: request.id },
      data: { status: JoinRequestStatus.rejected, respondedAt: new Date() },
    });

    void notifyUsers(
      this.prisma,
      [request.studentId],
      {
        type: NotificationType.team_join_request,
        title: 'Join request declined',
        body: `${team.name} declined your request to join the team. You can request again if a slot opens up.`,
        relatedEntity: team.id,
        template: 'join_request_outcome',
      },
    ).catch((err) => console.error('[teams.rejectJoinRequest] notify student failed', err));

    return updated;
  }

  /** Team a user leads or has an accepted membership in, if any. */
  private async findUserTeam(userId: string) {
    return this.prisma.team.findFirst({
      where: {
        OR: [
          { leaderUserId: userId },
          { members: { some: { userId, inviteStatus: InviteStatus.accepted } } },
        ],
      },
      select: { id: true, name: true, leaderUserId: true },
    });
  }

  async lock(user: AuthUser, teamId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (user.platformRole !== 'admin') {
      throw new ForbiddenException('Only admin or system lock can freeze a team');
    }
    const before = { status: team.status, detailsLockAt: team.detailsLockAt };
    const updated = await this.repo.lock(teamId);
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'team.lock',
      entityType: 'team',
      entityId: teamId,
      before,
      after: { status: updated.status, detailsLockAt: updated.detailsLockAt },
    });
    return updated;
  }

  async disqualify(user: AuthUser, teamId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    const updated = await this.repo.update(teamId, { status: TeamStatus.disqualified });
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'team.disqualify',
      entityType: 'team',
      entityId: teamId,
      before: { status: team.status },
      after: { status: updated.status },
    });
    return updated;
  }

  async assertCanView(
    user: AuthUser,
    team: {
      leaderUserId: string;
      members: Array<{ userId: string | null }>;
      mentorAssignments: Array<{ mentorUserId: string }>;
    },
  ) {
    if (user.platformRole === 'admin') return;
    if (team.leaderUserId === user.id) return;
    if (team.members.some((m) => m.userId === user.id)) return;
    if (team.mentorAssignments.some((m) => m.mentorUserId === user.id)) return;
    throw new ForbiddenException('Not a member of this team');
  }

  async assertTeamAccess(user: AuthUser, teamId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    await this.assertCanView(user, team);
    return team;
  }

  isLeader(user: AuthUser, team: { leaderUserId: string }) {
    return team.leaderUserId === user.id || user.platformRole === 'admin';
  }
}
