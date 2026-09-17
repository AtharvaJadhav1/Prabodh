import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, MentorType, PlatformRole } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { pickLeastLoadedMentor } from '../../domain/rules';
import { writeAudit } from '../../lib/audit';
import { sendMentorInviteEmail } from '../../lib/invite-email';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { getSettingNumber } from '../../lib/settings';
import { PsPreferencesService } from '../ps-preferences/service';
import { MentorsRepository } from './repository';
import { allocateSchema, mentorInviteSchema } from './schema';

@Injectable()
export class MentorsService {
  constructor(
    private readonly repo: MentorsRepository,
    private readonly prisma: PrismaService,
    private readonly psPreferences: PsPreferencesService,
  ) {}

  async allocate(admin: AuthUser, body: z.infer<typeof allocateSchema>) {
    const existing = await this.repo.activeForTeam(body.teamId, body.mentorType as MentorType);
    if (existing) {
      throw new BadRequestException('Team already has an active mentor of this type; use reassign');
    }
    const capKey = body.mentorType === 'institute' ? 'institute_mentor_cap' : 'industry_mentor_cap';
    const cap = await getSettingNumber(this.prisma, capKey);
    const activeOfType = await this.prisma.mentorAssignment.count({
      where: { teamId: body.teamId, mentorType: body.mentorType, active: true },
    });
    if (activeOfType >= cap) {
      throw new BadRequestException(`Team already has ${cap} ${body.mentorType} mentor(s)`);
    }
    const assignment = await this.repo.create({
      team: { connect: { id: body.teamId } },
      mentor: { connect: { id: body.mentorUserId } },
      assignedBy: { connect: { id: admin.id } },
      mentorType: body.mentorType,
      assignmentMethod: body.assignmentMethod,
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.allocate',
      entityType: 'mentor_assignment',
      entityId: assignment.id,
      after: assignment as never,
    });
    await notifyUsers(this.prisma, [assignment.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'New team allocated',
      body: `You have been allocated as mentor to ${assignment.team.name}.`,
      relatedEntity: `team:${assignment.teamId}`,
    });
    try {
      await this.psPreferences.promoteSavedOnMentorAssigned(body.teamId);
    } catch {
      /* PS auto-submit is best-effort */
    }
    return assignment;
  }

  async autoAllocate(admin: AuthUser, mentorType: MentorType) {
    const teams = await this.repo.unassignedTeams(mentorType);
    const mentors = await this.repo.mentorsByType(mentorType);
    if (!mentors.length) throw new BadRequestException('No mentors available for auto-allocation');
    const load = await this.repo.loadByMentor(mentors.map((m) => m.id));
    const results = [];
    for (const team of teams) {
      const mentor = pickLeastLoadedMentor(mentors, load, team.theme);
      if (!mentor) continue;
      const assignment = await this.allocate(admin, {
        teamId: team.id,
        mentorUserId: mentor.id,
        mentorType,
        assignmentMethod: 'auto_rule',
      });
      results.push(assignment);
      load.set(mentor.id, (load.get(mentor.id) ?? 0) + 1);
    }
    return { allocated: results.length, results };
  }

  async reassign(admin: AuthUser, assignmentId: string, mentorUserId: string) {
    const current = await this.repo.findById(assignmentId);
    if (!current) throw new NotFoundException('Assignment not found');
    await this.repo.deactivate(assignmentId);
    const next = await this.repo.create({
      team: { connect: { id: current.teamId } },
      mentor: { connect: { id: mentorUserId } },
      assignedBy: { connect: { id: admin.id } },
      mentorType: current.mentorType,
      assignmentMethod: 'manual',
      reassignedFrom: { connect: { id: assignmentId } },
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.reassign',
      entityType: 'mentor_assignment',
      entityId: next.id,
      before: { assignmentId, mentorUserId: current.mentorUserId },
      after: { assignmentId: next.id, mentorUserId },
    });
    await notifyUsers(this.prisma, [next.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Team reassigned to you',
      body: `You have been allocated as mentor to ${next.team.name}.`,
      relatedEntity: `team:${next.teamId}`,
    });
    return next;
  }

  async myTeams(user: AuthUser) {
    const assignments = await this.repo.teamsForMentor(user.id);
    const pendingInvites = await this.prisma.mentorInvite.findMany({
      where: {
        inviteStatus: InviteStatus.pending,
        OR: [{ mentorUserId: user.id }, { invitedEmail: user.email }],
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            teamCode: true,
            theme: true,
            institute: true,
            leader: { select: { id: true, fullName: true, email: true } },
            members: { where: { inviteStatus: InviteStatus.accepted }, select: { id: true } },
          },
        },
      },
    });

    const assignedTeamIds = new Set(assignments.map((a) => a.teamId));
    const inviteRows = pendingInvites
      .filter((invite) => !assignedTeamIds.has(invite.teamId))
      .map((invite) => ({
        id: `invite:${invite.id}`,
        teamId: invite.teamId,
        mentorUserId: user.id,
        mentorType: invite.mentorType,
        active: false,
        pendingInvite: true,
        inviteId: invite.id,
        team: invite.team,
      }));

    return [...assignments, ...inviteRows];
  }

  listFaculty() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        platformRole: { in: [PlatformRole.institute_mentor, PlatformRole.industry_mentor] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        institute: true,
        domainTags: true,
        platformRole: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async inviteFromLeader(user: AuthUser, body: z.infer<typeof mentorInviteSchema>) {
    const team = await this.prisma.team.findUnique({ where: { id: body.teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can invite mentors');
    }

    const email = body.email.toLowerCase();
    if (body.mentorType === 'industry') {
      throw new BadRequestException('Industry mentors are centrally allocated by the platform.');
    }
    const mentorType: MentorType = 'institute';
    const expectedRole = PlatformRole.institute_mentor;
    const mentor = await this.prisma.user.findUnique({ where: { email } });
    if (!mentor || !mentor.isActive || mentor.platformRole !== expectedRole) {
      throw new BadRequestException(
        'No faculty account exists for this email. Ask your nodal admin to create their Prabodh login first.',
      );
    }

    if (team.mentorLockedAt) {
      throw new BadRequestException('This team already has a locked faculty mentor');
    }
    const active = await this.repo.activeForTeam(team.id, mentorType);
    if (active) {
      throw new BadRequestException('This team already has a locked faculty mentor');
    }

    const existing = await this.prisma.mentorInvite.findUnique({
      where: { teamId_invitedEmail_mentorType: { teamId: team.id, invitedEmail: email, mentorType } },
    });
    const invite = existing
      ? await this.prisma.mentorInvite.update({
          where: { id: existing.id },
          data: {
            inviteStatus: InviteStatus.pending,
            mentorUserId: mentor.id,
            invitedById: user.id,
          },
          include: { mentor: true, team: true },
        })
      : await this.prisma.mentorInvite.create({
          data: {
            teamId: team.id,
            invitedEmail: email,
            mentorUserId: mentor.id,
            mentorType,
            invitedById: user.id,
            inviteStatus: InviteStatus.pending,
          },
          include: { mentor: true, team: true },
        });

    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendMentorInviteEmail({
        to: email,
        teamName: team.name,
        leaderName: user.fullName,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Email delivery failed';
      console.error('[mentors.invite] email delivery failed for', email, emailError);
    }
    try {
      await notifyUsers(this.prisma, [mentor.id], {
        type: 'allocation',
        template: 'mentor_allocation',
        title: 'Mentor invitation received',
        body: `${user.fullName} invited you to mentor ${team.name}.`,
        relatedEntity: `team:${team.id}`,
      });
    } catch {
      /* in-app notifications are best-effort */
    }
    return { ...invite, emailSent, emailError };
  }

  async revokeInvite(user: AuthUser, inviteId: string) {
    const invite = await this.prisma.mentorInvite.findUnique({ include: { team: true }, where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.team.leaderUserId !== user.id && user.platformRole !== 'admin') {
      throw new ForbiddenException('Only the team leader can revoke mentor invites');
    }
    if (invite.inviteStatus === InviteStatus.accepted) {
      throw new BadRequestException('Accepted mentor assignments cannot be revoked here');
    }
    return this.prisma.mentorInvite.update({
      where: { id: inviteId },
      data: { inviteStatus: InviteStatus.revoked },
    });
  }

  pendingInvitesForMentor(user: AuthUser) {
    return this.prisma.mentorInvite.findMany({
      where: {
        inviteStatus: InviteStatus.pending,
        OR: [{ mentorUserId: user.id }, { invitedEmail: user.email }],
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            teamCode: true,
            theme: true,
            institute: true,
            leader: { select: { id: true, fullName: true, email: true } },
            members: { where: { inviteStatus: InviteStatus.accepted }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInvite(user: AuthUser, inviteId: string, accept: boolean) {
    const invite = await this.prisma.mentorInvite.findUnique({
      where: { id: inviteId },
      include: { team: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    const isInvitee = invite.mentorUserId === user.id || invite.invitedEmail === user.email;
    if (!isInvitee && user.platformRole !== 'admin') {
      throw new ForbiddenException('This invitation is not for your account');
    }
    if (invite.inviteStatus !== InviteStatus.pending) {
      throw new BadRequestException('This invitation is no longer pending');
    }
    if (!accept) {
      return this.prisma.mentorInvite.update({
        where: { id: inviteId },
        data: { inviteStatus: InviteStatus.revoked },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "teams" WHERE id = ${invite.teamId} FOR UPDATE`;

      const fresh = await tx.mentorInvite.findUnique({
        where: { id: inviteId },
        include: { team: true },
      });
      if (!fresh || fresh.inviteStatus !== InviteStatus.pending) {
        throw new BadRequestException('This invitation is no longer pending');
      }
      const team = fresh.team;

      const active = await tx.mentorAssignment.findFirst({
        where: { teamId: team.id, mentorType: fresh.mentorType, active: true },
      });
      if (team.mentorLockedAt || active) {
        await tx.mentorInvite.update({
          where: { id: fresh.id },
          data: { inviteStatus: InviteStatus.expired },
        });
        return { accepted: false };
      }

      const assignment = await tx.mentorAssignment.create({
        data: {
          team: { connect: { id: team.id } },
          mentor: { connect: { id: user.id } },
          assignedBy: { connect: { id: fresh.invitedById } },
          mentorType: fresh.mentorType,
          assignmentMethod: 'manual',
        },
      });
      await tx.team.update({
        where: { id: team.id },
        data: { mentorLockedAt: new Date() },
      });
      await tx.mentorInvite.update({
        where: { id: fresh.id },
        data: { inviteStatus: InviteStatus.accepted, mentorUserId: user.id },
      });
      await tx.mentorInvite.updateMany({
        where: { teamId: team.id, inviteStatus: InviteStatus.pending, id: { not: fresh.id } },
        data: { inviteStatus: InviteStatus.expired },
      });
      return { accepted: true, assignment };
    });

    if (result.accepted) {
      try {
        await notifyUsers(this.prisma, [invite.invitedById], {
          type: 'allocation',
          template: 'mentor_allocation',
          title: 'Mentor invitation accepted',
          body: `${user.fullName} accepted the mentor invitation for ${invite.team.name}.`,
          relatedEntity: `team:${invite.teamId}`,
        });
      } catch {
        /* notifications are best-effort */
      }
      try {
        await this.psPreferences.promoteSavedOnMentorAssigned(invite.teamId);
      } catch {
        /* PS auto-submit is best-effort */
      }
    }
    return result;
  }
}
