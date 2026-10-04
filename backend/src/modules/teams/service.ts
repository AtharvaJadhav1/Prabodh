import { canFreezeTeam, dedupeMentorAssignmentsByType, mentorRoleFor, seatConflict } from '../../lib/mentor-rules';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, JoinRequestStatus, NotificationType, PlatformRole, Prisma, PsPreferenceStatus, TeamStatus } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { hasAnyRole, hasRole } from '../../lib/roles';
import { writeAudit } from '../../lib/audit';
import { lockTeamRow, syncTeamMentorPointers } from '../../lib/mentor-pointers';
import { createNotifications, notifyUsers } from '../../lib/notify';
import { deleteObjectsByPrefix, isS3Configured } from '../../lib/s3';
import { PrismaService } from '../../lib/prisma.service';
import { sendTeamMemberInviteEmail } from '../../lib/invite-email';
import { consumeToken } from '../../lib/rate-limit';
import { getSettingNumber } from '../../lib/settings';
import { resolveDeliverableRow } from '../../lib/deliverable-url';
import { generateTeamCode, TeamsRepository } from './repository';
import { createTeamSchema, inviteSchema, patchTeamSchema } from './schema';
import { z } from 'zod';

const MAX_TEAM_CODE_ATTEMPTS = 3;

/**
 * Unsubmitted ("saved") problem statement preferences stay private to the student
 * until they submit them. `undefined` means "no status filter" (students + admins).
 */
export function visiblePsStatuses(user: AuthUser): PsPreferenceStatus[] | undefined {
  if (user.platformRole === 'student' || hasRole(user, PlatformRole.admin)) return undefined;
  return [PsPreferenceStatus.submitted, PsPreferenceStatus.approved];
}

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
        // A disqualified team no longer holds its former leader or members.
        status: { not: 'disqualified' },
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
      for (let attempt = 1; attempt <= MAX_TEAM_CODE_ATTEMPTS; attempt++) {
        const teamCode = await generateTeamCode(this.prisma);

        try {
          const team = await this.repo.create({
            teamCode,
            name: body.name,
            institute: body.institute,
            theme: body.theme,
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
          await writeAudit(this.prisma, {
            actorUserId: user.id,
            action: 'team.created',
            entityType: 'team',
            entityId: team.id,
            after: { name: team.name, teamCode: team.teamCode, theme: team.theme ?? null, institute: team.institute },
          });
          return team;
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
    return await this.withResolvedDeliverables(team);
  }

  async get(user: AuthUser, teamId: string, view: 'dashboard' | 'full' = 'dashboard') {
    const team =
      view === 'full'
        ? await this.repo.findById(teamId, { psPreferenceStatuses: visiblePsStatuses(user) })
        : await this.repo.findByIdDashboard(teamId);
    if (!team) throw new NotFoundException('Team not found');
    await this.assertCanView(user, team);
    return await this.withResolvedDeliverables(team);
  }

  async listDeliverables(user: AuthUser, teamId: string) {
    await this.assertTeamAccess(user, teamId);
    const rows = await this.repo.listDeliverables(teamId);
    return Promise.all(rows.map((row) => resolveDeliverableRow(row)));
  }

  private async withResolvedDeliverables<T>(team: T): Promise<T> {
    const raw = team as {
      deliverables?: Array<{ pptUrl?: string | null; reportUrl?: string | null; videoUrl?: string | null }>;
      mentorAssignments?: Array<{ mentorType: string; assignedAt: Date; createdAt: Date }>;
    };
    let result = team;
    if (raw.deliverables?.length) {
      const deliverables = await Promise.all(raw.deliverables.map((d) => resolveDeliverableRow(d)));
      result = { ...result, deliverables };
    }
    // Defense-in-depth against legacy/racy data — see dedupeMentorAssignmentsByType.
    if (raw.mentorAssignments && raw.mentorAssignments.length > 1) {
      result = { ...result, mentorAssignments: dedupeMentorAssignmentsByType(raw.mentorAssignments) };
    }
    return result;
  }

  /** Both mentors of a team (faculty + industrial) with assignment provenance. */
  async mentorDetails(user: AuthUser, teamId: string) {
    await this.assertTeamAccess(user, teamId);
    const [assignments, pendingIndustryInvite] = await Promise.all([
      this.prisma.mentorAssignment.findMany({
        where: { teamId, active: true },
        // Defense-in-depth: if legacy/racy data ever has two active rows of the
        // same mentorType, the .find() below deterministically keeps the most
        // recent one rather than whatever order Postgres happens to return.
        orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          mentor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              institute: true,
              department: true,
              domainTags: true,
              platformRole: true,
            },
          },
          assignedBy: { select: { id: true, fullName: true, platformRole: true } },
          industrialMentor: true,
        },
      }),
      this.prisma.mentorInvite.findFirst({
        where: { teamId, mentorType: 'industry', inviteStatus: InviteStatus.pending },
        orderBy: { createdAt: 'desc' },
        include: { invitedBy: { select: { id: true, fullName: true, platformRole: true } } },
      }),
    ]);

    const faculty = assignments.find((a) => a.mentorType === 'institute');
    const industrial = assignments.find((a) => a.mentorType === 'industry');

    return {
      faculty:
        faculty && {
          userId: faculty.mentorUserId,
          name: faculty.mentor.fullName,
          email: faculty.mentor.email,
          phone: faculty.mentor.phone,
          department: faculty.mentor.department,
          institute: faculty.mentor.institute,
          domainTags: faculty.mentor.domainTags,
          assignmentMethod: faculty.assignmentMethod,
          assignedAt: faculty.assignedAt,
          assignedBy: {
            id: faculty.assignedBy.id,
            name: faculty.assignedBy.fullName,
            role: faculty.assignedBy.platformRole,
          },
        },
      industrial:
        industrial && {
          id: industrial.industrialMentor?.id ?? null,
          userId: industrial.mentorUserId,
          name: industrial.mentor.fullName,
          email: industrial.mentor.email,
          phone: industrial.mentor.phone,
          companyName: industrial.industrialMentor?.companyName ?? industrial.mentor.institute,
          designation: industrial.industrialMentor?.designation ?? industrial.mentor.department,
          domainExpertise: industrial.industrialMentor?.domainExpertise ?? industrial.mentor.domainTags,
          assignmentMethod: industrial.assignmentMethod,
          assignedAt: industrial.assignedAt,
          assignedBy: {
            id: industrial.assignedBy.id,
            name: industrial.assignedBy.fullName,
            role: industrial.assignedBy.platformRole,
          },
        },
      pendingIndustryInvite:
        pendingIndustryInvite && {
          id: pendingIndustryInvite.id,
          invitedEmail: pendingIndustryInvite.invitedEmail,
          mentorUserId: pendingIndustryInvite.mentorUserId,
          invitedById: pendingIndustryInvite.invitedById,
          invitedByName: pendingIndustryInvite.invitedBy.fullName,
          invitedAt: pendingIndustryInvite.createdAt,
        },
    };
  }

  /** Admin-only direct assignment/override. Industrial mentors are otherwise invite-accepted. */
  async assignIndustrialMentor(
    user: AuthUser,
    teamId: string,
    industrialMentorId?: string,
    userId?: string,
  ) {
    const profile = await this.prisma.industrialMentor.findUnique({
      where: userId && !industrialMentorId ? { userId } : { id: industrialMentorId! },
      include: { user: { select: { id: true, isActive: true } } },
    });
    if (!profile || !profile.isActive || !profile.user.isActive) {
      throw new BadRequestException('Industrial mentor profile not found or inactive');
    }
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const cap = await getSettingNumber(this.prisma, 'industry_mentor_cap');
    if (cap < 1) {
      throw new BadRequestException('Industrial mentor assignments are disabled for this team.');
    }
    const holder = await this.prisma.user.findUnique({
      where: { id: profile.user.id },
      select: { platformRole: true, additionalRoles: true },
    });
    if (!holder || !hasRole(holder, mentorRoleFor('industry'))) {
      throw new BadRequestException('That person no longer holds the industry mentor role.');
    }

    // Read-check-write under a team row lock so concurrent assignments serialize; the partial unique
    // index mentor_assignments_team_type_active_unique backs this up (P2002).
    let result;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          await lockTeamRow(tx, teamId);
          const activeAssignments = await tx.mentorAssignment.findMany({
            where: { teamId, mentorType: 'industry', active: true },
          });
          // A dual-role account can't be both the faculty and the industrial mentor of one team.
          const facultySeats = await tx.mentorAssignment.findMany({
            where: { teamId, mentorType: 'institute', active: true },
            select: { mentorUserId: true, mentorType: true, active: true },
          });
          const seatProblem = seatConflict(facultySeats, profile.user.id, 'industry');
          if (seatProblem) throw new BadRequestException(seatProblem);
          // This always replaces the team's whole active industry slate with this one mentor, so an
          // existing active mentor of a different person is not a cap breach — only re-picking the
          // SAME person is a no-op worth rejecting.
          if (activeAssignments.some((a) => a.industrialMentorId === profile.id)) {
            throw new BadRequestException('That mentor is already assigned to this team.');
          }
          await tx.mentorAssignment.updateMany({
            where: { teamId, mentorType: 'industry', active: true },
            data: { active: false },
          });
          const next = await tx.mentorAssignment.create({
            data: {
              teamId,
              mentorUserId: profile.user.id,
              mentorType: 'industry',
              assignedById: user.id,
              assignmentMethod: 'manual',
              industrialMentorId: profile.id,
              ...(activeAssignments[0] ? { reassignedFromId: activeAssignments[0].id } : {}),
            },
            include: { team: true },
          });
          await syncTeamMentorPointers(tx, teamId);
          return { next, displaced: activeAssignments.map((a) => a.mentorUserId) };
        },
        { timeout: 15000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That assignment was just changed by someone else. Refresh and try again.');
      }
      throw err;
    }
    const { next: assignment, displaced } = result;

    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'mentor.assign_industry',
      entityType: 'mentor_assignment',
      entityId: assignment.id,
      after: { teamId, industrialMentorId: profile.id, mentorUserId: profile.user.id, mentorType: 'industry' },
    });
    const notify = (ids: string[], title: string, body: string) =>
      notifyUsers(this.prisma, ids, {
        type: 'allocation',
        template: 'mentor_allocation',
        title,
        body,
        relatedEntity: `team:${teamId}`,
      }).catch((err) => this.logger.error(`notification "${title}" failed: ${(err as Error).message}`));
    await notify([profile.user.id], 'New team allocated', `You have been assigned as industrial mentor to ${team.name}.`);
    const outgoing = displaced.filter((id) => id !== profile.user.id);
    if (outgoing.length) {
      await notify(outgoing, 'Removed from team', `You are no longer the industrial mentor of ${team.name}; another mentor has been assigned.`);
    }
    return assignment;
  }

  async listForUser(user: AuthUser, page: number, limit: number) {
    if (hasRole(user, PlatformRole.admin)) {
      return this.list(page, limit);
    }
    if (hasAnyRole(user, [PlatformRole.institute_mentor, PlatformRole.industry_mentor])) {
      const assignments = await this.prisma.mentorAssignment.findMany({
        where: { mentorUserId: user.id, active: true },
        select: {
          team: {
            select: {
              id: true,
              teamCode: true,
              name: true,
              theme: true,
              institute: true,
              leaderUserId: true,
              status: true,
              psId: true,
              createdAt: true,
              updatedAt: true,
              leader: {
                select: { id: true, fullName: true, email: true, department: true, institute: true },
              },
              problemStatement: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  theme: true,
                  category: true,
                  organisation: true,
                  description: true,
                },
              },
            },
          },
        },
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
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
      throw new ForbiddenException('Only the team leader can edit details');
    }
    if (team.status === TeamStatus.locked || team.detailsLockAt) {
      throw new ForbiddenException('Team details are locked');
    }
    const updated = await this.repo.update(teamId, body);
    if (typeof body.name === 'string' && body.name !== team.name) {
      await writeAudit(this.prisma, {
        actorUserId: user.id,
        action: 'team.renamed',
        entityType: 'team',
        entityId: teamId,
        before: { name: team.name },
        after: { name: body.name },
      });
    }
    return updated;
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

    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'team.invite',
      entityType: 'team',
      entityId: teamId,
      after: { invitedEmail: email },
    });

    return { ...member, emailSent: true, emailError: null };
  }

  async removeMember(user: AuthUser, teamId: string, memberId: string) {
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
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
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
      throw new ForbiddenException('Only the team leader can revoke invites');
    }
    const member = await this.prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('Invite not found');
    if (member.inviteStatus === InviteStatus.accepted) {
      throw new BadRequestException('Cannot revoke an accepted member; remove them separately');
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
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'team.join',
      entityType: 'team',
      entityId: invite.teamId,
      after: { memberEmail: user.email, memberName: user.fullName },
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
      select: { id: true, name: true, leaderUserId: true },
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
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
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
      select: { id: true, name: true, leaderUserId: true },
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
      throw new ForbiddenException('Only the team leader can accept join requests');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const verified = await tx.team.findUnique({
        where: { id: team.id },
        select: { id: true, leaderUserId: true },
      });
      if (!verified) throw new NotFoundException('Team not found');
      if (verified.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
        throw new ForbiddenException('Only the team leader can accept join requests');
      }

      const alreadyPlaced = await tx.team.findFirst({
        where: {
          AND: [
            { id: { not: team.id } },
            { status: { not: 'disqualified' } },
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
    if (team.leaderUserId !== user.id && !hasRole(user, PlatformRole.admin)) {
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
        status: { not: 'disqualified' },
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
    // Admin, or the ACTIVE faculty (institute) mentor of THIS team — not any institute mentor,
    // and not a dual-role user who is only this team's industry mentor.
    const assignments = await this.prisma.mentorAssignment.findMany({
      where: { teamId, active: true },
      select: { mentorUserId: true, mentorType: true, active: true },
    });
    if (!canFreezeTeam(user, assignments)) {
      throw new ForbiddenException('Only an admin or the team faculty mentor can freeze a team');
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

  /**
   * Admin-only. Disqualifying removes the team's data and frees its people:
   *  - all team data (comments, deliverables, evaluations, results, PS preferences, ideas, requests,
   *    invites, mentor assignments, stage statuses, memberships, batch) is deleted in one transaction;
   *  - the team row stays, marked "disqualified", so history and the audit log keep making sense;
   *  - students no longer see it and can create/join another team; mentors lose the assignment;
   *  - students and mentors are notified, and uploaded files are deleted from storage (best effort).
   */
  async disqualify(user: AuthUser, teamId: string) {
    if (!hasRole(user, PlatformRole.admin)) {
      throw new ForbiddenException('Only an admin can disqualify a team');
    }
    const team = await this.repo.findForAccessCheck(teamId);
    if (!team) throw new NotFoundException('Team not found');
    if (team.status === TeamStatus.disqualified) {
      throw new BadRequestException('This team is already disqualified.');
    }

    const [memberRows, mentorRows, teamRow] = await Promise.all([
      this.prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } }),
      this.prisma.mentorAssignment.findMany({ where: { teamId, active: true }, select: { mentorUserId: true } }),
      this.prisma.team.findUnique({ where: { id: teamId }, select: { psId: true } }),
    ]);
    const studentIds = [
      ...new Set([team.leaderUserId, ...memberRows.map((m) => m.userId).filter((id): id is string => !!id)]),
    ];
    const mentorIds = [...new Set(mentorRows.map((m) => m.mentorUserId))];

    const removed = await this.prisma.$transaction(
      async (tx) => {
        await tx.comment.updateMany({
          where: { teamId, parentCommentId: { not: null } },
          data: { parentCommentId: null },
        });
        const comments = (await tx.comment.deleteMany({ where: { teamId } })).count;
        const deliverables = (await tx.deliverable.deleteMany({ where: { teamId } })).count;
        await tx.evaluation.updateMany({
          where: { supersededBy: { teamId } },
          data: { supersededById: null },
        });
        const evaluations = (await tx.evaluation.deleteMany({ where: { teamId } })).count;
        const ideas = (await tx.ideaSubmission.deleteMany({ where: { teamId } })).count;
        const joinRequests = (await tx.joinRequest.deleteMany({ where: { teamId } })).count;
        const mentorAssignments = (await tx.mentorAssignment.deleteMany({ where: { teamId } })).count;
        const mentorInvites = (await tx.mentorInvite.deleteMany({ where: { teamId } })).count;
        const stageResults = (await tx.stageResult.deleteMany({ where: { teamId } })).count;
        const members = (await tx.teamMember.deleteMany({ where: { teamId } })).count;
        const psPreferences = (await tx.teamPsPreference.deleteMany({ where: { teamId } })).count;
        const stageStatuses = (await tx.teamStageStatus.deleteMany({ where: { teamId } })).count;
        await tx.notification.deleteMany({ where: { relatedEntity: `team:${teamId}` } });
        if (teamRow?.psId) {
          await tx.problemStatement.updateMany({
            where: { id: teamRow.psId },
            data: { teamsSelectedCount: { decrement: 1 } },
          });
        }
        await tx.team.update({
          where: { id: teamId },
          data: {
            status: TeamStatus.disqualified,
            psId: null,
            batchId: null,
            mentorLockedAt: null,
            facultyMentorId: null,
            industrialMentorId: null,
          },
        });
        return {
          comments,
          deliverables,
          evaluations,
          ideas,
          joinRequests,
          mentorAssignments,
          mentorInvites,
          stageResults,
          members,
          psPreferences,
          stageStatuses,
        };
      },
      { timeout: 30_000 },
    );

    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'team.disqualify',
      entityType: 'team',
      entityId: teamId,
      before: { status: team.status },
      after: { status: TeamStatus.disqualified, teamName: team.name, memberCount: studentIds.length, removed },
    });

    // Tell the people affected (fire and forget: never fail the disqualification over an email).
    void notifyUsers(this.prisma, studentIds, {
      type: 'status_change',
      template: 'admin_broadcast',
      title: `Your team "${team.name}" has been disqualified`,
      body: `The administrator has disqualified team "${team.name}" (${team.teamCode}). The team's data has been removed and you are no longer part of it. You can now create a new team or join another one.`,
    }).catch((err) => console.error('[teams.disqualify] student notification failed', err));
    void notifyUsers(this.prisma, mentorIds, {
      type: 'status_change',
      template: 'admin_broadcast',
      title: `Team "${team.name}" has been disqualified`,
      body: `The administrator has disqualified team "${team.name}" (${team.teamCode}). It has been removed from your assigned teams.`,
    }).catch((err) => console.error('[teams.disqualify] mentor notification failed', err));

    // Uploaded files go too (best effort: a storage hiccup must not undo the disqualification).
    if (isS3Configured()) {
      void deleteObjectsByPrefix(`deliverables/${teamId}/`).catch((err) =>
        console.error('[teams.disqualify] could not delete stored files for', teamId, err),
      );
    }

    return { ok: true, teamId, status: TeamStatus.disqualified, removed };
  }

  async assertCanView(
    user: AuthUser,
    team: {
      leaderUserId: string;
      status?: string;
      members: Array<{ userId: string | null }>;
      mentorAssignments: Array<{ mentorUserId: string }>;
    },
  ) {
    if (hasRole(user, PlatformRole.admin)) return;
    if (team.status === 'disqualified') {
      throw new ForbiddenException('This team has been disqualified and is no longer available.');
    }
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
    return team.leaderUserId === user.id || hasRole(user, PlatformRole.admin);
  }
}
