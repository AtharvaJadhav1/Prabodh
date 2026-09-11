import { Injectable } from '@nestjs/common';
import { IdeaStatus, Prisma } from '@prisma/client';
import { isPsCapReached } from '../../domain/rules';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class ProblemStatementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { theme?: string; category?: string; organisation?: string; q?: string }, skip: number, take: number) {
    const where: Prisma.ProblemStatementWhereInput = {
      ...(filters.theme ? { theme: { contains: filters.theme, mode: 'insensitive' } } : {}),
      ...(filters.category ? { category: filters.category as never } : {}),
      ...(filters.organisation ? { organisation: { contains: filters.organisation, mode: 'insensitive' } } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: 'insensitive' } },
              { code: { contains: filters.q, mode: 'insensitive' } },
              { description: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.problemStatement.findMany({ where, skip, take, orderBy: { code: 'asc' } }),
      this.prisma.problemStatement.count({ where }),
    ]);
  }

  createPs(data: Prisma.ProblemStatementCreateInput) {
    return this.prisma.problemStatement.create({ data });
  }

  findPs(id: string) {
    return this.prisma.problemStatement.findUnique({ where: { id } });
  }

  findIdea(id: string) {
    return this.prisma.ideaSubmission.findUnique({ where: { id }, include: { team: true, problemStatement: true } });
  }

  findLatestIdeaForTeam(teamId: string) {
    return this.prisma.ideaSubmission.findFirst({
      where: { teamId },
      orderBy: { version: 'desc' },
    });
  }

  async createDraftWithCap(input: {
    teamId: string;
    psId: string;
    abstract: string;
    techStack: string;
    feasibilityNotes: string;
    authorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ps = await tx.problemStatement.findUnique({ where: { id: input.psId } });
      if (!ps) return { error: 'ps_not_found' as const };
      if (isPsCapReached(ps.teamsSelectedCount, ps.teamCap)) {
        return { error: 'ps_full' as const };
      }
      await tx.problemStatement.update({
        where: { id: input.psId },
        data: { teamsSelectedCount: { increment: 1 } },
      });
      const idea = await tx.ideaSubmission.create({
        data: {
          teamId: input.teamId,
          psId: input.psId,
          abstract: input.abstract,
          techStack: input.techStack,
          feasibilityNotes: input.feasibilityNotes,
          status: IdeaStatus.draft,
          version: 1,
          authorUserId: input.authorUserId,
        },
      });
      return { idea };
    });
  }

  async updateDraft(id: string, data: Prisma.IdeaSubmissionUpdateInput, previousPsId?: string, nextPsId?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (previousPsId && nextPsId && previousPsId !== nextPsId) {
        const ps = await tx.problemStatement.findUnique({ where: { id: nextPsId } });
        if (!ps) return { error: 'ps_not_found' as const };
        if (isPsCapReached(ps.teamsSelectedCount, ps.teamCap)) {
          return { error: 'ps_full' as const };
        }
        await tx.problemStatement.update({
          where: { id: previousPsId },
          data: { teamsSelectedCount: { decrement: 1 } },
        });
        await tx.problemStatement.update({
          where: { id: nextPsId },
          data: { teamsSelectedCount: { increment: 1 } },
        });
      }
      const idea = await tx.ideaSubmission.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      return { idea };
    });
  }

  lockIdea(id: string, teamId: string, psId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ps = await tx.problemStatement.findUnique({ where: { id: psId } });
      const idea = await tx.ideaSubmission.update({
        where: { id },
        data: { status: IdeaStatus.locked, lockedAt: new Date() },
      });
      await tx.team.update({
        where: { id: teamId },
        data: {
          psId,
          status: 'locked',
          detailsLockAt: new Date(),
          ...(ps?.theme ? { theme: ps.theme } : {}),
        },
      });
      return idea;
    });
  }

  async abandonDraft(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const idea = await tx.ideaSubmission.findUnique({ where: { id } });
      if (!idea || idea.status !== IdeaStatus.draft) return { error: 'not_draft' as const };
      await tx.ideaSubmission.update({
        where: { id },
        data: { status: IdeaStatus.abandoned },
      });
      await tx.problemStatement.update({
        where: { id: idea.psId },
        data: { teamsSelectedCount: { decrement: 1 } },
      });
      return { ok: true as const };
    });
  }

  async releaseStaleDrafts(hours: number) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000);
    const stale = await this.prisma.ideaSubmission.findMany({
      where: { status: IdeaStatus.draft, updatedAt: { lte: cutoff } },
    });
    let released = 0;
    for (const idea of stale) {
      const res = await this.abandonDraft(idea.id);
      if ('ok' in res) released += 1;
    }
    return { released };
  }
}
