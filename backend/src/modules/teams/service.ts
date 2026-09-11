import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, TeamStatus } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { writeAudit } from '../../lib/audit';
import { getClerkClient } from '../../lib/clerk';
import { PrismaService } from '../../lib/prisma.service';
import { sendTeamMemberInviteEmail } from '../../lib/invite-email';
import { consumeToken } from '../../lib/rate-limit';
import { getSettingNumber } from '../../lib/settings';
import { generateTeamCode, TeamsRepository } from './repository';
import { createTeamSchema, inviteSchema, patchTeamSchema } from './schema';
import { z } from 'zod';

@Injectable()
export class TeamsService {
  constructor(
    private readonly repo: TeamsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(user: AuthUser, body: z.infer<typeof createTeamSchema>) {
    if (user.platformRole !== 'student') {
      throw new ForbiddenException('Only students can create teams');
    }
    const defaultCap = await getSettingNumber(this.prisma, 'member_cap');
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

    const team = await this.repo.create({
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
    return team;
  }

  async get(user: AuthUser, teamId: string) {
    const team = await this.repo.findById(teamId);
    if (!team) throw new NotFoundException('Team not found');
    await this.assertCanView(user, team);
    return team;
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
    const team = await this.repo.findById(teamId);
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
    const team = await this.repo.findById(teamId);
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

    const clerk = getClerkClient();
    let clerkInvitationId: string | null = null;
    if (clerk && !team.clerkOrgId.startsWith('local-org-')) {
      try {
        const invitation = await clerk.organizations.createOrganizationInvitation({
          organizationId: team.clerkOrgId,
          emailAddress: email,
          role: 'org:member',
          inviterUserId: user.clerkUserId,
        });
        clerkInvitationId = invitation.id;
      } catch {
        // Clerk org invite is optional; portal invite still lands in the roster.
      }
    }

    const member =
      existing && (existing.inviteStatus === InviteStatus.revoked || existing.inviteStatus === InviteStatus.expired)
        ? await this.prisma.teamMember.update({
            where: { id: existing.id },
            data: { inviteStatus: InviteStatus.pending, clerkInvitationId },
          })
        : await this.repo.addMember({
            team: { connect: { id: teamId } },
            invitedEmail: email,
            inviteStatus: InviteStatus.pending,
            clerkInvitationId,
          });

    void sendTeamMemberInviteEmail({
      to: email,
      teamName: team.name,
      teamCode: team.teamCode,
      leaderName: user.fullName,
    }).catch((err) => {
      console.error('[teams.invite] email delivery failed for', email, err);
    });

    return { ...member, emailSent: true, emailError: null };
  }

  async removeMember(user: AuthUser, teamId: string, memberId: string) {
    const team = await this.repo.findById(teamId);
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
    const team = await this.repo.findById(teamId);
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

  async lock(user: AuthUser, teamId: string) {
    const team = await this.repo.findById(teamId);
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
    const team = await this.repo.findById(teamId);
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
    const team = await this.repo.findById(teamId);
    if (!team) throw new NotFoundException('Team not found');
    await this.assertCanView(user, team);
    return team;
  }

  isLeader(user: AuthUser, team: { leaderUserId: string }) {
    return team.leaderUserId === user.id || user.platformRole === 'admin';
  }
}
