import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IdeaStatus, PsPreferenceStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { isPsCapReached } from '../../domain/rules';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { ProblemStatementsRepository } from '../problem-statements/repository';
import { TeamsService } from '../teams/service';
import { PsPreferencesRepository } from './repository';
import { submitPreferencesSchema } from './schema';

@Injectable()
export class PsPreferencesService {
  constructor(
    private readonly repo: PsPreferencesRepository,
    private readonly psRepo: ProblemStatementsRepository,
    private readonly teams: TeamsService,
    private readonly prisma: PrismaService,
  ) {}

  async list(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    return this.repo.listForTeam(teamId);
  }

  async save(user: AuthUser, teamId: string, body: z.infer<typeof submitPreferencesSchema>) {
    const team = await this.teams.assertTeamAccess(user, teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can save problem statement preferences');
    }
    await this.ensureNotFinalized(teamId);
    return this.repo.replaceAll(teamId, user.id, body.preferences, PsPreferenceStatus.saved);
  }

  async submit(user: AuthUser, teamId: string, body: z.infer<typeof submitPreferencesSchema>) {
    const team = await this.teams.assertTeamAccess(user, teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can submit problem statement preferences');
    }
    await this.ensureNotFinalized(teamId);

    const preferences = await this.repo.replaceAll(teamId, user.id, body.preferences, PsPreferenceStatus.saved);

    const mentors = await this.prisma.mentorAssignment.findMany({
      where: { teamId, active: true },
      include: { mentor: true },
    });
    if (!mentors.length) {
      return { sent: false, code: 'PS_NO_ACTIVE_MENTOR', preferences };
    }

    await this.repo.setSubmitted(teamId);
    try {
      await notifyUsers(
        this.prisma,
        mentors.map((m) => m.mentorUserId),
        {
          type: 'status_change',
          template: 'ps_review',
          title: 'PS preferences submitted for review',
          body: `${team.name} (${team.teamCode}) submitted ${body.preferences.length} ranked problem statement preference(s). Review and lock one.`,
          relatedEntity: `team:${teamId}`,
        },
      );
    } catch {
      /* notifications are best-effort */
    }

    return { sent: true, preferences: await this.repo.listForTeam(teamId) };
  }

  private async ensureNotFinalized(teamId: string) {
    const lockedIdea = await this.prisma.ideaSubmission.findFirst({
      where: { teamId, status: IdeaStatus.locked },
    });
    if (lockedIdea) {
      throw new ForbiddenException('Problem statement already locked for this team');
    }
    const approved = await this.repo.hasApprovedOrLocked(teamId);
    if (approved) {
      throw new ForbiddenException('Problem statement already locked for this team');
    }
  }

  async approve(user: AuthUser, teamId: string, preferenceId: string) {
    const isActiveMentor = await this.prisma.mentorAssignment.findFirst({
      where: { teamId, mentorUserId: user.id, active: true },
    });
    if (!isActiveMentor && user.platformRole !== 'admin') {
      throw new ForbiddenException('You are not an active mentor for this team');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "teams" WHERE id = ${teamId} FOR UPDATE`;

      const preference = await tx.teamPsPreference.findUnique({ where: { id: preferenceId } });
      if (!preference || preference.teamId !== teamId) {
        throw new NotFoundException('Preference not found');
      }
      if (preference.status !== PsPreferenceStatus.submitted) {
        throw new BadRequestException('Preference is not awaiting review');
      }
      const lockedIdea = await tx.ideaSubmission.findFirst({ where: { teamId, status: IdeaStatus.locked } });
      if (lockedIdea) {
        throw new ForbiddenException('Problem statement already locked for this team');
      }

      let psId = preference.psId;
      if (!psId) {
        const team = await tx.team.findUnique({ where: { id: teamId } });
        const code = `STU-${team?.teamCode ?? teamId}-${Date.now().toString(36).toUpperCase()}`;
        const ps = await tx.problemStatement.create({
          data: {
            code,
            title: preference.title ?? 'Untitled proposal',
            theme: preference.theme ?? 'General',
            category: preference.category ?? 'software',
            organisation: preference.organisation ?? 'Student Innovation',
            description: preference.description ?? '',
            teamCap: 1,
          },
        });
        psId = ps.id;
      } else {
        const ps = await tx.problemStatement.findUnique({ where: { id: psId } });
        if (!ps) throw new NotFoundException('Problem statement not found');
        if (isPsCapReached(ps.teamsSelectedCount, ps.teamCap)) {
          throw new ConflictException('PS full: team cap reached for this problem statement');
        }
        await tx.problemStatement.update({ where: { id: psId }, data: { teamsSelectedCount: { increment: 1 } } });
      }

      const idea = await tx.ideaSubmission.create({
        data: {
          teamId,
          psId,
          abstract: `Selected via ranked preference #${preference.rank}.`,
          techStack: 'To be confirmed',
          feasibilityNotes: 'Captured at mentor approval of ranked preference.',
          status: IdeaStatus.draft,
          version: 1,
          authorUserId: user.id,
        },
      });
      await this.psRepo.applyLock(tx, { ideaId: idea.id, teamId, psId });

      const decidedAt = new Date();
      await tx.teamPsPreference.update({
        where: { id: preferenceId },
        data: { status: PsPreferenceStatus.approved, decidedById: user.id, decidedAt },
      });
      await tx.teamPsPreference.updateMany({
        where: { teamId, id: { not: preferenceId }, status: PsPreferenceStatus.submitted },
        data: { status: PsPreferenceStatus.rejected, decidedById: user.id, decidedAt },
      });

      return {
        idea: await tx.ideaSubmission.findUnique({ where: { id: idea.id }, include: { problemStatement: true } }),
        preferences: await tx.teamPsPreference.findMany({
          where: { teamId },
          orderBy: { rank: 'asc' },
          include: { problemStatement: true },
        }),
      };
    });
  }
}
