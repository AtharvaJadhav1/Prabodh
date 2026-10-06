import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, MentorType, PlatformRole, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { pickLeastLoadedMentor } from '../../domain/rules';
import { writeAudit } from '../../lib/audit';
import { lockTeamRow, requireIndustrialProfileId, syncTeamMentorPointers } from '../../lib/mentor-pointers';
import { isSelfInvite, mentorRoleFor, sameEmail, seatConflict } from '../../lib/mentor-rules';
import { hasRole } from '../../lib/roles';
import { isTeamFrozen, TEAM_FROZEN_MESSAGE } from '../../lib/team-rules';
import { sendMentorInviteEmail } from '../../lib/invite-email';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { getSettingNumber } from '../../lib/settings';
import { CATEGORY_ACTIONS, enrichAuditRows } from '../../lib/audit-view';
import { parsePagination } from '../../common/pagination';
import { PsPreferencesService } from '../ps-preferences/service';
import { MentorsRepository } from './repository';
import { allocateSchema, auditLogQuerySchema, mentorInviteSchema } from './schema';

type Notice = Parameters<typeof notifyUsers>[2];

@Injectable()
export class MentorsService {
  private readonly logger = new Logger(MentorsService.name);

  constructor(
    private readonly repo: MentorsRepository,
    private readonly prisma: PrismaService,
    private readonly psPreferences: PsPreferencesService,
  ) {}

  /** A failed notification must never turn an already-committed seat change into a 500. */
  private async safeNotify(userIds: string[], payload: Notice) {
    try {
      await notifyUsers(this.prisma, userIds, payload);
    } catch (err) {
      this.logger.error(`notification "${payload.title}" failed: ${(err as Error).message}`);
    }
  }

  /**
   * Seat changes (allocate / reassign / assign-institute / unassign / accept-invite / assign-industrial)
   * all follow the same recipe: lock the team row, re-read the active seat, write with `active: true`
   * guards, and sync the team pointers + mentorLockedAt in the same transaction. The partial unique
   * index mentor_assignments_team_type_active_unique is the last line of defence (P2002).
   */
  /** A disqualified team is frozen, so no mentor seat can be created, moved or removed on it. */
  private async assertTeamMutable(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { status: true } });
    if (team && isTeamFrozen(team.status)) throw new ForbiddenException(TEAM_FROZEN_MESSAGE);
    return team;
  }

  async allocate(admin: AuthUser, body: z.infer<typeof allocateSchema>) {
    await this.assertTeamMutable(body.teamId);
    const mentorType = body.mentorType as MentorType;
    const capKey = mentorType === 'institute' ? 'institute_mentor_cap' : 'industry_mentor_cap';
    const cap = await getSettingNumber(this.prisma, capKey);
    let assignment;
    try {
      assignment = await this.prisma.$transaction(
        async (tx) => {
          await lockTeamRow(tx, body.teamId);
          const existing = await tx.mentorAssignment.findFirst({
            where: { teamId: body.teamId, mentorType, active: true },
          });
          if (existing) {
            throw new BadRequestException('Team already has an active mentor of this type; use reassign');
          }
          await this.assertSeatEligible(tx, body.teamId, body.mentorUserId, mentorType);
          const activeOfType = await tx.mentorAssignment.count({
            where: { teamId: body.teamId, mentorType, active: true },
          });
          if (activeOfType >= cap) {
            throw new BadRequestException(`Team already has ${cap} ${mentorType} mentor(s)`);
          }
          const industrialMentorId =
            mentorType === 'industry' ? await requireIndustrialProfileId(tx, body.mentorUserId) : null;
          const created = await tx.mentorAssignment.create({
            data: {
              team: { connect: { id: body.teamId } },
              mentor: { connect: { id: body.mentorUserId } },
              assignedBy: { connect: { id: admin.id } },
              mentorType,
              assignmentMethod: body.assignmentMethod,
              ...(industrialMentorId ? { industrialMentor: { connect: { id: industrialMentorId } } } : {}),
            },
            include: { mentor: true, team: true },
          });
          // Also stamps mentorLockedAt for an institute seat, matching the invite-accept path.
          await syncTeamMentorPointers(tx, body.teamId);
          return created;
        },
        { timeout: 15000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Team already has an active mentor of this type; use reassign');
      }
      throw err;
    }
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.allocate',
      entityType: 'mentor_assignment',
      entityId: assignment.id,
      after: {
        teamId: assignment.teamId,
        mentorUserId: assignment.mentorUserId,
        mentorType: assignment.mentorType,
        assignmentMethod: assignment.assignmentMethod,
      },
    });
    await this.safeNotify([assignment.mentor.id], {
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

  /**
   * Admin override guard: the person must be active, hold the matching mentor role, and not already
   * hold the OTHER seat on this team (dual-role accounts). `ignoreAssignmentId` = the seat being replaced.
   */
  private async assertSeatEligible(
    db: Prisma.TransactionClient,
    teamId: string,
    mentorUserId: string,
    mentorType: MentorType,
    ignoreAssignmentId?: string,
  ) {
    const candidate = await db.user.findUnique({
      where: { id: mentorUserId },
      select: { id: true, isActive: true, platformRole: true, additionalRoles: true },
    });
    if (!candidate || !candidate.isActive) throw new BadRequestException('That mentor account is not active.');
    if (!hasRole(candidate, mentorRoleFor(mentorType))) {
      throw new BadRequestException(
        mentorType === 'institute'
          ? 'That person is not an institute (faculty) mentor.'
          : 'That person is not an industry mentor.',
      );
    }
    const seats = await db.mentorAssignment.findMany({
      where: { teamId, active: true, ...(ignoreAssignmentId ? { id: { not: ignoreAssignmentId } } : {}) },
      select: { mentorUserId: true, mentorType: true, active: true },
    });
    const conflict = seatConflict(seats, mentorUserId, mentorType);
    if (conflict) throw new BadRequestException(conflict);
  }

  /**
   * Auto-allocates faculty mentors to unassigned teams. A seat conflict for one team/mentor never aborts
   * the run: that candidate is skipped (next least-loaded eligible mentor is tried) and the outcome is
   * reported. Response keeps `allocated` + `results`; `skipped` is new.
   */
  async autoAllocate(admin: AuthUser, mentorType: MentorType) {
    if (mentorType === 'industry') {
      throw new BadRequestException(
        'Industrial mentors are never auto-allocated; faculty mentors invite them and they accept or decline.',
      );
    }
    const teams = await this.repo.unassignedTeams(mentorType);
    const mentors = await this.repo.mentorsByType(mentorType);
    if (!mentors.length) throw new BadRequestException('No mentors available for auto-allocation');
    const load = await this.repo.loadByMentor(mentors.map((m) => m.id));
    const results = [];
    const skipped: { teamId: string; reason: string }[] = [];
    for (const team of teams) {
      let candidates = [...mentors];
      let reason = 'No eligible mentor available';
      let done = false;
      while (candidates.length && !done) {
        const mentor = pickLeastLoadedMentor(candidates, load, team.theme);
        if (!mentor) break;
        try {
          const assignment = await this.allocate(admin, {
            teamId: team.id,
            mentorUserId: mentor.id,
            mentorType,
            assignmentMethod: 'auto_rule',
          });
          results.push(assignment);
          load.set(mentor.id, (load.get(mentor.id) ?? 0) + 1);
          done = true;
        } catch (err) {
          if (!(err instanceof HttpException)) throw err;
          reason = err.message;
          // Someone else seated this team meanwhile: nothing left to do for it.
          if (await this.repo.activeForTeam(team.id, mentorType)) break;
          candidates = candidates.filter((m) => m.id !== mentor.id);
        }
      }
      if (!done) skipped.push({ teamId: team.id, reason });
    }
    return { allocated: results.length, results, skipped };
  }

  async reassign(admin: AuthUser, assignmentId: string, mentorUserId: string) {
    const initial = await this.repo.findById(assignmentId);
    if (!initial) throw new NotFoundException('Assignment not found');
    await this.assertTeamMutable(initial.teamId);
    // Deactivate + create in one transaction so a failed create never leaves the team without a mentor.
    let next;
    try {
      next = await this.prisma.$transaction(
        async (tx) => {
          await lockTeamRow(tx, initial.teamId);
          const current = await tx.mentorAssignment.findUnique({ where: { id: assignmentId } });
          if (!current) throw new NotFoundException('Assignment not found');
          if (!current.active) {
            throw new BadRequestException('That assignment is no longer active. Refresh and try again.');
          }
          if (current.mentorUserId === mentorUserId) {
            throw new BadRequestException('That mentor is already assigned to this team.');
          }
          // The seat being replaced doesn't count as a conflict for the incoming mentor.
          await this.assertSeatEligible(tx, current.teamId, mentorUserId, current.mentorType, assignmentId);
          const industrialMentorId =
            current.mentorType === 'industry' ? await requireIndustrialProfileId(tx, mentorUserId) : null;
          const deactivated = await tx.mentorAssignment.updateMany({
            where: { id: assignmentId, active: true },
            data: { active: false },
          });
          if (deactivated.count === 0) {
            throw new BadRequestException('That assignment was just changed by someone else. Refresh and try again.');
          }
          const created = await tx.mentorAssignment.create({
            data: {
              team: { connect: { id: current.teamId } },
              mentor: { connect: { id: mentorUserId } },
              assignedBy: { connect: { id: admin.id } },
              mentorType: current.mentorType,
              assignmentMethod: 'manual',
              reassignedFrom: { connect: { id: assignmentId } },
              ...(industrialMentorId ? { industrialMentor: { connect: { id: industrialMentorId } } } : {}),
            },
            include: { mentor: true, team: true },
          });
          await syncTeamMentorPointers(tx, current.teamId);
          return { created, previousMentorUserId: current.mentorUserId };
        },
        { timeout: 15000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That assignment was just changed by someone else. Refresh and try again.');
      }
      throw err;
    }
    const { created, previousMentorUserId } = next;
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.reassign',
      entityType: 'mentor_assignment',
      entityId: created.id,
      before: { assignmentId, mentorUserId: previousMentorUserId, mentorType: created.mentorType },
      after: { assignmentId: created.id, mentorUserId, teamId: created.teamId, mentorType: created.mentorType },
    });
    await this.safeNotify([created.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Team reassigned to you',
      body: `You have been allocated as mentor to ${created.team.name}.`,
      relatedEntity: `team:${created.teamId}`,
    });
    await this.safeNotify([previousMentorUserId], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Removed from team',
      body: `You are no longer the ${created.mentorType} mentor of ${created.team.name}; another mentor has been assigned.`,
      relatedEntity: `team:${created.teamId}`,
    });
    return created;
  }

  /**
   * Admin override for the institute-mentor slot, decided entirely server-side: looks up whatever
   * is currently active for (teamId, institute) inside the same transaction that replaces it, so the
   * caller never has to know (or guess, from possibly-stale client state) whether this is a first
   * allocation or an override. Mirrors TeamsService.assignIndustrialMentor's approach for industry.
   */
  async assignInstituteMentor(admin: AuthUser, teamId: string, mentorUserId: string) {
    await this.assertTeamMutable(teamId);
    let result;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          await lockTeamRow(tx, teamId);
          const current = await tx.mentorAssignment.findFirst({
            where: { teamId, mentorType: 'institute', active: true },
          });
          if (current?.mentorUserId === mentorUserId) {
            throw new BadRequestException('That mentor is already assigned to this team.');
          }
          // The seat being replaced doesn't count as a conflict for the incoming mentor.
          await this.assertSeatEligible(tx, teamId, mentorUserId, 'institute', current?.id);
          if (current) {
            const deactivated = await tx.mentorAssignment.updateMany({
              where: { id: current.id, active: true },
              data: { active: false },
            });
            if (deactivated.count === 0) {
              throw new BadRequestException('Team already has an active mentor of this type. Refresh and try again.');
            }
          }
          const created = await tx.mentorAssignment.create({
            data: {
              team: { connect: { id: teamId } },
              mentor: { connect: { id: mentorUserId } },
              assignedBy: { connect: { id: admin.id } },
              mentorType: 'institute',
              assignmentMethod: 'manual',
              ...(current ? { reassignedFrom: { connect: { id: current.id } } } : {}),
            },
            include: { mentor: true, team: true },
          });
          await syncTeamMentorPointers(tx, teamId);
          return { created, replaced: current ? { id: current.id, mentorUserId: current.mentorUserId } : null };
        },
        { timeout: 15000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Team already has an active mentor of this type. Refresh and try again.');
      }
      throw err;
    }
    const { created: assignment, replaced } = result;
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: replaced ? 'mentor.reassign' : 'mentor.allocate',
      entityType: 'mentor_assignment',
      entityId: assignment.id,
      ...(replaced
        ? {
            before: { assignmentId: replaced.id, mentorUserId: replaced.mentorUserId, mentorType: 'institute' },
            after: { assignmentId: assignment.id, mentorUserId, teamId, mentorType: 'institute' },
          }
        : {
            after: {
              teamId,
              mentorUserId,
              mentorType: 'institute',
              assignmentMethod: assignment.assignmentMethod,
            },
          }),
    });
    await this.safeNotify([assignment.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: replaced ? 'Team reassigned to you' : 'New team allocated',
      body: `You have been allocated as mentor to ${assignment.team.name}.`,
      relatedEntity: `team:${teamId}`,
    });
    if (replaced) {
      await this.safeNotify([replaced.mentorUserId], {
        type: 'allocation',
        template: 'mentor_allocation',
        title: 'Removed from team',
        body: `You are no longer the institute mentor of ${assignment.team.name}; another mentor has been assigned.`,
        relatedEntity: `team:${teamId}`,
      });
    }
    try {
      await this.psPreferences.promoteSavedOnMentorAssigned(teamId);
    } catch {
      /* PS auto-submit is best-effort */
    }
    return assignment;
  }

  async unassign(admin: AuthUser, assignmentId: string) {
    const initial = await this.repo.findById(assignmentId);
    if (!initial) throw new NotFoundException('Assignment not found');
    await this.assertTeamMutable(initial.teamId);
    const updated = await this.prisma.$transaction(
      async (tx) => {
        await lockTeamRow(tx, initial.teamId);
        const deactivated = await tx.mentorAssignment.updateMany({
          where: { id: assignmentId, active: true },
          data: { active: false },
        });
        if (deactivated.count === 0) throw new BadRequestException('Assignment is already inactive');
        // Clears team.mentorLockedAt when this was the last active faculty seat.
        await syncTeamMentorPointers(tx, initial.teamId);
        return tx.mentorAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
      },
      { timeout: 15000 },
    );
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.unassign',
      entityType: 'mentor_assignment',
      entityId: assignmentId,
      before: {
        mentorUserId: initial.mentorUserId,
        mentorType: initial.mentorType,
        teamId: initial.teamId,
        teamName: initial.team.name,
      },
      after: { active: false, teamId: initial.teamId },
    });
    return updated;
  }

  /**
   * `mentorType` scopes the result to one workspace. Dual-role accounts (institute + industry) must
   * not see the teams they mentor as faculty inside the Industry workspace, or the reverse.
   */
  async myTeams(user: AuthUser, mentorType?: MentorType) {
    const assignments = await this.repo.teamsForMentor(user.id, mentorType);
    const pendingInvites = await this.prisma.mentorInvite.findMany({
      where: {
        inviteStatus: InviteStatus.pending,
        ...(mentorType ? { mentorType } : {}),
        OR: [{ mentorUserId: user.id }, { invitedEmail: { equals: user.email, mode: 'insensitive' } }],
      },
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
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
        invitedBy: invite.invitedBy,
        team: invite.team,
      }));

    return [...assignments, ...inviteRows];
  }

  /** Audit trail limited to the teams this mentor is actively assigned to. `query` is already validated (auditLogQuerySchema). */
  async teamAuditLog(
    user: AuthUser,
    query: z.infer<typeof auditLogQuerySchema> & { mentorType?: MentorType },
  ) {
    const { page, limit, skip, take } = parsePagination(query);
    const mine = await this.prisma.mentorAssignment.findMany({
      where: { mentorUserId: user.id, active: true, ...(query.mentorType ? { mentorType: query.mentorType } : {}) },
      select: { teamId: true },
    });
    // Disqualifying a team deletes both its record and its mentor assignments, which would drop
    // the team — and every log line the mentor ever generated for it — out of this scope. Two
    // sources are unioned back in: teams the mentor personally acted on, and teams whose
    // disqualification snapshotted them as a prior mentor.
    const [actedOn, snapshot] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { actorUserId: user.id, entityType: 'team' },
        select: { entityId: true },
        distinct: ['entityId'],
      }),
      // A dual-role account can hold both seats, so the snapshot is read per workspace:
      // without this filter, institute history would leak into the industry audit view.
      // `OR` is unavailable inside a JSON filter, so the two workspaces are OR-ed at row level.
      this.prisma.auditLog.findMany({
        where: {
          action: 'team.disqualify',
          entityType: 'team',
          OR: query.mentorType
            ? [{ after: { path: [query.mentorType === 'industry' ? 'industryMentorIds' : 'instituteMentorIds'], array_contains: user.id } }]
            : [
                { after: { path: ['instituteMentorIds'], array_contains: user.id } },
                { after: { path: ['industryMentorIds'], array_contains: user.id } },
              ],
        },
        select: { entityId: true },
        distinct: ['entityId'],
      }),
    ]);
    let teamIds = [...new Set([...mine.map((a) => a.teamId), ...actedOn.map((h) => h.entityId), ...snapshot.map((h) => h.entityId)])];
    if (query.teamId) teamIds = teamIds.filter((id) => id === query.teamId);
    if (!teamIds.length) return { items: [], total: 0, page, limit, pages: 0, teamOptions: [] };

    // Options for the team filter, built from the same scope as the rows. The mentor's current
    // team list can't be reused: a disqualified team is no longer assigned, so it would be
    // missing from that dropdown while its logs are still listed below.
    const scopedTeams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, teamCode: true },
    });

    const assignments = await this.prisma.mentorAssignment.findMany({
      where: { teamId: { in: teamIds } },
      select: { id: true },
    });
    const scope: Prisma.AuditLogWhereInput = {
      OR: [
        { entityType: 'team', entityId: { in: teamIds } },
        { entityType: 'mentor_assignment', entityId: { in: assignments.map((a) => a.id) } },
        ...teamIds.map((id) => ({ after: { path: ['teamId'], equals: id } })),
      ],
    };
    const actions =
      query.category && Object.prototype.hasOwnProperty.call(CATEGORY_ACTIONS, query.category)
        ? CATEGORY_ACTIONS[query.category]
        : undefined;
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        scope,
        ...(actions ? [{ action: { in: actions } }] : []),
        ...(query.hours ? [{ createdAt: { gte: new Date(Date.now() - query.hours * 3_600_000) } }] : []),
        ...(query.search
          ? [
              {
                OR: [
                  { actorName: { contains: query.search, mode: 'insensitive' as const } },
                  { actorEmail: { contains: query.search, mode: 'insensitive' as const } },
                  { actor: { fullName: { contains: query.search, mode: 'insensitive' as const } } },
                ],
              },
            ]
          : []),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, email: true, fullName: true, platformRole: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    // Raw before/after payloads can hold other people's details — mentors only get the summary.
    const items = (await enrichAuditRows(this.prisma, rows)).map(({ before: _b, after: _a, ...rest }) => rest);
    return { items, total, page, limit, pages: Math.ceil(total / limit), teamOptions: scopedTeams };
  }

  listFaculty() {
    // Faculty directory: anyone holding institute_mentor (primary OR secondary),
    // so industry-primary dual accounts appear as invitable faculty too.
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { platformRole: PlatformRole.institute_mentor },
          { additionalRoles: { has: PlatformRole.institute_mentor } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        institute: true,
        domainTags: true,
        platformRole: true,
        additionalRoles: true,
        // Public LinkedIn link — students see a clickable icon beside the name.
        linkedinUrl: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * Response: the invite row plus `emailSent` (true only if the provider accepted the message — it is
   * awaited) and `emailError` (provider/config error message, else null).
   */
  async inviteFromLeader(user: AuthUser, body: z.infer<typeof mentorInviteSchema>) {
    const team = await this.prisma.team.findUnique({ where: { id: body.teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (isTeamFrozen(team.status)) throw new ForbiddenException(TEAM_FROZEN_MESSAGE);

    const mentorType: MentorType = body.mentorType;
    const email = body.email.trim().toLowerCase();
    const isAdmin = hasRole(user, PlatformRole.admin);

    if (mentorType === 'institute') {
      if (team.leaderUserId !== user.id && !isAdmin) {
        throw new ForbiddenException('Only the team leader can invite a faculty mentor');
      }
    } else if (!isAdmin) {
      const faculty = await this.repo.activeForTeam(team.id, 'institute');
      if (!faculty || faculty.mentorUserId !== user.id) {
        throw new ForbiddenException("Only the team's faculty mentor can invite an industrial mentor");
      }
    }

    let mentor: { id: string };
    if (mentorType === 'industry') {
      const profile = await this.prisma.industrialMentor.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { user: { select: { id: true, isActive: true, platformRole: true, additionalRoles: true } } },
      });
      if (!profile || !profile.isActive || !profile.user.isActive) {
        throw new BadRequestException(
          'No industrial mentor profile exists for this email. Ask your nodal admin to onboard them first.',
        );
      }
      if (!hasRole(profile.user, PlatformRole.industry_mentor)) {
        throw new BadRequestException('That person no longer holds the industry mentor role.');
      }
      mentor = { id: profile.user.id };
    } else {
      const found = await this.prisma.user.findUnique({ where: { email } });
      if (!found || !found.isActive || !hasRole(found, PlatformRole.institute_mentor)) {
        throw new BadRequestException(
          'No faculty account exists for this email. Ask your nodal admin to create their Prabodh login first.',
        );
      }
      mentor = { id: found.id };
    }

    if (isSelfInvite(user.id, mentor.id)) {
      throw new BadRequestException('You cannot invite yourself as a mentor.');
    }

    // State-dependent checks and the upsert run under the team row lock so two concurrent invites
    // cannot both slip past the cap / pending-invite checks.
    const invite = await this.prisma.$transaction(
      async (tx) => {
        await lockTeamRow(tx, team.id);
        const freshTeam = await tx.team.findUnique({ where: { id: team.id }, select: { mentorLockedAt: true } });
        const seats = await tx.mentorAssignment.findMany({
          where: { teamId: team.id, active: true },
          select: { mentorUserId: true, mentorType: true, active: true },
        });
        if (mentorType === 'institute') {
          if (freshTeam?.mentorLockedAt || seats.some((s) => s.mentorType === 'institute')) {
            throw new BadRequestException('This team already has a locked faculty mentor');
          }
        } else if (!isAdmin) {
          const cap = await getSettingNumber(tx, 'industry_mentor_cap');
          const activeCount = seats.filter((s) => s.mentorType === 'industry').length;
          if (activeCount >= cap) {
            throw new BadRequestException(`Team already has ${cap} industrial mentor(s)`);
          }
          const otherPending = await tx.mentorInvite.count({
            where: {
              teamId: team.id,
              mentorType: 'industry',
              inviteStatus: InviteStatus.pending,
              NOT: { invitedEmail: email },
            },
          });
          if (activeCount + otherPending >= cap) {
            throw new BadRequestException(
              'An industrial mentor invitation is already pending for this team. Revoke it before inviting someone else.',
            );
          }
        }
        const conflict = seatConflict(seats, mentor.id, mentorType);
        if (conflict) throw new BadRequestException(conflict);
        return this.upsertMentorInvite(tx, {
          teamId: team.id,
          email,
          mentorUserId: mentor.id,
          mentorType,
          invitedById: user.id,
        });
      },
      { timeout: 15000 },
    );

    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'mentor.invite',
      entityType: 'mentor_invite',
      entityId: invite.id,
      after: { teamId: team.id, mentorType, invitedEmail: email, mentorUserId: mentor.id },
    });

    void this.safeNotify([mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Mentor invitation received',
      body: `${user.fullName} invited you to mentor ${team.name}.`,
      relatedEntity: `team:${team.id}`,
    });

    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendMentorInviteEmail({ to: email, teamName: team.name, leaderName: user.fullName });
      emailSent = true;
    } catch (err) {
      emailError = (err as Error)?.message || 'Email delivery failed';
      console.error('[mentors.invite] email delivery failed for', email, err);
    }

    return { ...invite, emailSent, emailError };
  }

  async revokeInvite(user: AuthUser, inviteId: string) {
    const invite = await this.prisma.mentorInvite.findUnique({ include: { team: true }, where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (
      invite.team.leaderUserId !== user.id &&
      invite.invitedById !== user.id &&
      !hasRole(user, PlatformRole.admin)
    ) {
      throw new ForbiddenException('Only the team leader, the mentor who sent the invite, or an admin can revoke it');
    }
    if (invite.inviteStatus === InviteStatus.accepted) {
      throw new BadRequestException('Accepted mentor assignments cannot be revoked here');
    }
    if (invite.inviteStatus !== InviteStatus.pending) {
      throw new BadRequestException(`This invitation is already ${invite.inviteStatus}`);
    }
    // Atomic: only a still-pending invite can be revoked; a concurrent accept/decline wins cleanly.
    const changed = await this.prisma.mentorInvite.updateMany({
      where: { id: inviteId, inviteStatus: InviteStatus.pending },
      data: { inviteStatus: InviteStatus.revoked },
    });
    if (changed.count === 0) {
      throw new ConflictException('This invitation was just changed by someone else. Refresh and try again.');
    }
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'mentor.invite_revoked',
      entityType: 'mentor_invite',
      entityId: invite.id,
      after: {
        teamId: invite.teamId,
        mentorType: invite.mentorType,
        invitedEmail: invite.invitedEmail,
        mentorUserId: invite.mentorUserId,
        actorUserId: user.id,
        actorRole: invite.invitedById === user.id ? 'inviter' : invite.team.leaderUserId === user.id ? 'leader' : 'admin',
      },
    });
    return this.prisma.mentorInvite.findUniqueOrThrow({ where: { id: inviteId } });
  }

  async pendingInvitesForMentor(user: AuthUser, history = false, mentorType?: MentorType) {
    const rows = await this.prisma.mentorInvite.findMany({
      where: {
        inviteStatus: history ? { not: InviteStatus.pending } : InviteStatus.pending,
        ...(mentorType ? { mentorType } : {}),
        OR: [{ mentorUserId: user.id }, { invitedEmail: { equals: user.email, mode: 'insensitive' } }],
      },
      ...(history ? { take: 100 } : {}),
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
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
      orderBy: history ? { updatedAt: 'desc' } : { createdAt: 'desc' },
    });
    if (!history) return rows;
    // An accepted invite whose seat is no longer active (replaced / unassigned) is flagged so the
    // history can show "Unassigned" instead of a stale "Accepted".
    const accepted = rows.filter((r) => r.inviteStatus === InviteStatus.accepted);
    if (accepted.length === 0) return rows.map((r) => ({ ...r, unassigned: false }));
    const active = await this.prisma.mentorAssignment.findMany({
      where: { mentorUserId: user.id, active: true, teamId: { in: accepted.map((r) => r.teamId) } },
      select: { teamId: true, mentorType: true },
    });
    const held = new Set(active.map((a) => `${a.teamId}|${a.mentorType}`));
    return rows.map((r) => ({
      ...r,
      unassigned: r.inviteStatus === InviteStatus.accepted && !held.has(`${r.teamId}|${r.mentorType}`),
    }));
  }

  async respondToInvite(user: AuthUser, inviteId: string, accept: boolean) {
    const invite = await this.prisma.mentorInvite.findUnique({
      where: { id: inviteId },
      include: { team: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    // `include: { team: true }` already carries status, so accepting an invite for a team that
    // was disqualified while the invite was outstanding is refused rather than granted.
    if (isTeamFrozen(invite.team.status)) throw new ForbiddenException(TEAM_FROZEN_MESSAGE);
    const isInvitee = invite.mentorUserId === user.id || sameEmail(invite.invitedEmail, user.email);
    const isAdmin = hasRole(user, PlatformRole.admin);
    if (!isInvitee && !isAdmin) {
      throw new ForbiddenException('This invitation is not for your account');
    }
    if (invite.inviteStatus !== InviteStatus.pending) {
      throw new BadRequestException('This invitation is no longer pending');
    }
    if (!accept) {
      // Decline and revoke both end as inviteStatus=revoked; the audit entries (mentor.invite_declined vs
      // mentor.invite_revoked, with the actor) are what tell them apart.
      const changed = await this.prisma.mentorInvite.updateMany({
        where: { id: inviteId, inviteStatus: InviteStatus.pending },
        data: { inviteStatus: InviteStatus.revoked },
      });
      if (changed.count === 0) {
        throw new BadRequestException('This invitation is no longer pending');
      }
      await writeAudit(this.prisma, {
        actorUserId: user.id,
        action: 'mentor.invite_declined',
        entityType: 'mentor_invite',
        entityId: invite.id,
        after: {
          teamId: invite.teamId,
          mentorType: invite.mentorType,
          invitedEmail: invite.invitedEmail,
          mentorUserId: invite.mentorUserId,
          actorUserId: user.id,
          actorRole: isInvitee ? 'invitee' : 'admin',
        },
      });
      return this.prisma.mentorInvite.findUniqueOrThrow({ where: { id: inviteId } });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await lockTeamRow(tx, invite.teamId);

      const fresh = await tx.mentorInvite.findUnique({
        where: { id: inviteId },
        include: { team: true },
      });
      if (!fresh || fresh.inviteStatus !== InviteStatus.pending) {
        throw new BadRequestException('This invitation is no longer pending');
      }
      const team = fresh.team;

      // The seat belongs to the INVITED mentor, never to an admin acting on their behalf.
      let seatUserId = fresh.mentorUserId;
      if (!seatUserId) {
        if (isInvitee) {
          seatUserId = user.id;
        } else {
          const byEmail = await tx.user.findFirst({
            where: { email: { equals: fresh.invitedEmail, mode: 'insensitive' } },
            select: { id: true },
          });
          seatUserId = byEmail?.id ?? null;
        }
      }
      if (!seatUserId) {
        throw new BadRequestException('The invited mentor has no account yet, so this invitation cannot be accepted.');
      }
      const seatUser = await tx.user.findUnique({
        where: { id: seatUserId },
        select: { id: true, fullName: true, isActive: true, platformRole: true, additionalRoles: true },
      });
      if (!seatUser || !seatUser.isActive) {
        throw new BadRequestException('The invited mentor account is not active.');
      }
      if (!hasRole(seatUser, mentorRoleFor(fresh.mentorType))) {
        throw new BadRequestException(
          fresh.mentorType === 'institute'
            ? 'That person is not an institute (faculty) mentor.'
            : 'That person is not an industry mentor.',
        );
      }

      const active = await tx.mentorAssignment.findFirst({
        where: { teamId: team.id, mentorType: fresh.mentorType, active: true },
      });
      const facultyLocked = fresh.mentorType === 'institute' && team.mentorLockedAt !== null;
      const seats = await tx.mentorAssignment.findMany({
        where: { teamId: team.id, active: true },
        select: { mentorUserId: true, mentorType: true, active: true },
      });
      // A dual-role account may not take a second seat (faculty AND industrial) on the same team.
      if (seatConflict(seats, seatUserId, fresh.mentorType)) {
        await tx.mentorInvite.update({
          where: { id: fresh.id },
          data: { inviteStatus: InviteStatus.expired },
        });
        return { accepted: false as const };
      }
      if (facultyLocked || active) {
        await tx.mentorInvite.update({
          where: { id: fresh.id },
          data: { inviteStatus: InviteStatus.expired },
        });
        return { accepted: false as const };
      }

      if (fresh.mentorType === 'industry') {
        const cap = await getSettingNumber(tx, 'industry_mentor_cap');
        const activeCount = await tx.mentorAssignment.count({
          where: { teamId: team.id, mentorType: 'industry', active: true },
        });
        if (activeCount >= cap) {
          await tx.mentorInvite.update({
            where: { id: fresh.id },
            data: { inviteStatus: InviteStatus.expired },
          });
          return { accepted: false as const };
        }
      }

      const industrialMentorId =
        fresh.mentorType === 'industry' ? await requireIndustrialProfileId(tx, seatUserId) : null;

      const assignment = await tx.mentorAssignment.create({
        data: {
          team: { connect: { id: team.id } },
          mentor: { connect: { id: seatUserId } },
          assignedBy: { connect: { id: fresh.invitedById } },
          mentorType: fresh.mentorType,
          assignmentMethod: 'manual',
          ...(industrialMentorId ? { industrialMentor: { connect: { id: industrialMentorId } } } : {}),
        },
      });
      // Syncs facultyMentorId / industrialMentorId and stamps mentorLockedAt for an institute seat.
      await syncTeamMentorPointers(tx, team.id);
      await tx.mentorInvite.update({
        where: { id: fresh.id },
        // Keep the invite's own mentorUserId; only backfill it when it was never resolved.
        data: { inviteStatus: InviteStatus.accepted, ...(fresh.mentorUserId ? {} : { mentorUserId: seatUserId }) },
      });
      await tx.mentorInvite.updateMany({
        where: { teamId: team.id, inviteStatus: InviteStatus.pending, id: { not: fresh.id } },
        data: { inviteStatus: InviteStatus.expired },
      });
      return { accepted: true as const, assignment, mentorName: seatUser.fullName, seatUserId };
    }, { timeout: 15000 });

    if (!result.accepted) return result;

    void this.safeNotify([invite.invitedById], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Mentor invitation accepted',
      body: `${result.mentorName} accepted the mentor invitation for ${invite.team.name}.`,
      relatedEntity: `team:${invite.teamId}`,
    });
    void this.psPreferences.promoteSavedOnMentorAssigned(invite.teamId).catch(() => undefined);
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'mentor.invite_accepted',
      entityType: 'mentor_assignment',
      entityId: result.assignment.id,
      after: {
        teamId: invite.teamId,
        teamName: invite.team.name,
        mentorType: invite.mentorType,
        mentorUserId: result.seatUserId,
        actorUserId: user.id,
      },
    });
    return { accepted: true, assignment: result.assignment };
  }

  private async upsertMentorInvite(
    db: Prisma.TransactionClient,
    opts: {
      teamId: string;
      email: string;
      mentorUserId: string;
      mentorType: MentorType;
      invitedById: string;
    },
  ) {
    return db.mentorInvite.upsert({
      where: {
        teamId_invitedEmail_mentorType: {
          teamId: opts.teamId,
          invitedEmail: opts.email,
          mentorType: opts.mentorType,
        },
      },
      update: {
        inviteStatus: InviteStatus.pending,
        mentorUserId: opts.mentorUserId,
        invitedById: opts.invitedById,
      },
      create: {
        teamId: opts.teamId,
        invitedEmail: opts.email,
        mentorUserId: opts.mentorUserId,
        mentorType: opts.mentorType,
        invitedById: opts.invitedById,
        inviteStatus: InviteStatus.pending,
      },
      include: { mentor: true, team: true },
    });
  }

  async listIndustrialMentors(
    query: { domain?: string; q?: string; teamId?: string },
    requester?: AuthUser,
  ) {
    // Never offer the requester themself, nor anyone already holding a mentor seat on this team.
    const excludeUserIds = new Set<string>();
    if (requester) excludeUserIds.add(requester.id);
    if (query.teamId) {
      // Only an admin or someone actively seated on the team may probe its mentor roster.
      if (requester && !hasRole(requester, PlatformRole.admin)) {
        const own = await this.prisma.mentorAssignment.findFirst({
          where: { teamId: query.teamId, mentorUserId: requester.id, active: true },
          select: { id: true },
        });
        if (!own) throw new ForbiddenException('You are not a mentor of this team');
      }
      const seated = await this.prisma.mentorAssignment.findMany({
        where: { teamId: query.teamId, active: true },
        select: { mentorUserId: true },
      });
      seated.forEach((s) => excludeUserIds.add(s.mentorUserId));
    }
    return this.prisma.industrialMentor.findMany({
      where: {
        isActive: true,
        ...(excludeUserIds.size ? { userId: { notIn: [...excludeUserIds] } } : {}),
        ...(query.domain ? { domainExpertise: { has: query.domain } } : {}),
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: 'insensitive' } },
                { companyName: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
