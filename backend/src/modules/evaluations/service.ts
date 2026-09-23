import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { canStudentViewResults } from '../../domain/rules';
import { writeAudit } from '../../lib/audit';
import { PrismaService } from '../../lib/prisma.service';
import { aggregateQueue, notificationQueue } from '../../lib/queue';
import { TeamsService } from '../teams/service';
import { createEvaluationSchema, publishSchema } from './schema';

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  async submit(user: AuthUser, body: z.infer<typeof createEvaluationSchema>) {
    await this.teams.assertTeamAccess(user, body.teamId);
    const prior = await this.prisma.evaluation.findFirst({
      where: {
        teamId: body.teamId,
        stageId: body.stageId,
        rubricId: body.rubricId,
        evaluatorUserId: user.id,
        supersededById: null,
      },
    });
    const created = await this.prisma.evaluation.create({
      data: {
        teamId: body.teamId,
        stageId: body.stageId,
        rubricId: body.rubricId,
        evaluatorUserId: user.id,
        score: body.score,
        feedback: body.feedback,
      },
    });
    if (prior) {
      await this.prisma.evaluation.update({
        where: { id: prior.id },
        data: { supersededById: created.id },
      });
    }
    await writeAudit(this.prisma, {
      actorUserId: user.id,
      action: 'evaluation.submitted',
      entityType: 'evaluation',
      entityId: created.id,
      after: {
        teamId: body.teamId,
        stageId: body.stageId,
        rubricId: body.rubricId,
        score: Number(body.score),
        supersedes: Boolean(prior),
      },
    });
    await aggregateQueue().add('recompute', { teamId: body.teamId, stageId: body.stageId });
    await this.recomputeStageResult(body.teamId, body.stageId);
    return created;
  }

  async recomputeStageResult(teamId: string, stageId: string) {
    const rubrics = await this.prisma.rubric.findMany({ where: { stageId } });
    const latest = await this.prisma.evaluation.findMany({
      where: { teamId, stageId, supersededById: null },
    });
    let weighted = 0;
    for (const rubric of rubrics) {
      const scores = latest.filter((e) => e.rubricId === rubric.id).map((e) => Number(e.score));
      if (!scores.length) continue;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      weighted += (avg * Number(rubric.weightage)) / 100;
    }
    await this.prisma.stageResult.upsert({
      where: { teamId_stageId: { teamId, stageId } },
      create: { teamId, stageId, weightedScore: new Prisma.Decimal(weighted.toFixed(2)) },
      update: { weightedScore: new Prisma.Decimal(weighted.toFixed(2)) },
    });
    await this.rerank(stageId);
  }

  async rerank(stageId: string) {
    const rows = await this.prisma.stageResult.findMany({
      where: { stageId },
      orderBy: { weightedScore: 'desc' },
    });
    let rank = 1;
    for (const row of rows) {
      await this.prisma.stageResult.update({ where: { id: row.id }, data: { rank } });
      rank += 1;
    }
  }

  async results(stageId: string) {
    return this.prisma.stageResult.findMany({
      where: { stageId },
      include: { team: true },
      orderBy: { rank: 'asc' },
    });
  }

  async publish(admin: AuthUser, stageId: string, body: z.infer<typeof publishSchema>) {
    const where = body.teamIds?.length
      ? { stageId, teamId: { in: body.teamIds } }
      : { stageId };
    const updated = await this.prisma.stageResult.updateMany({
      where,
      data: { published: true, publishedAt: new Date(), publishedById: admin.id },
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'evaluation.publish',
      entityType: 'stage',
      entityId: stageId,
      after: { count: updated.count, teamIds: body.teamIds ?? 'all' },
    });
    const results = await this.prisma.stageResult.findMany({
      where: { ...where, published: true },
      include: { team: { include: { members: true } } },
    });
    for (const result of results) {
      for (const member of result.team.members) {
        if (!member.userId) continue;
        const user = await this.prisma.user.findUnique({ where: { id: member.userId } });
        if (!user) continue;
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'evaluation_published',
            title: 'Evaluation published',
            body: 'Your stage evaluation is now available.',
            relatedEntity: `stage:${stageId}`,
          },
        });
        await notificationQueue().add('send', {
          template: 'evaluation_published',
          recipientUserId: user.id,
          recipientEmail: user.email,
          title: 'Evaluation published',
          body: 'Your stage evaluation is now available in the portal.',
          relatedEntity: `stage:${stageId}`,
        });
      }
    }
    return { published: updated.count };
  }

  async myResults(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    const results = await this.prisma.stageResult.findMany({
      where: { teamId, published: true },
      include: { stage: true },
    });
    const unpublished = await this.prisma.stageResult.count({ where: { teamId, published: false } });
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        teamId,
        supersededById: null,
        stage: { stageResults: { some: { teamId, published: true } } },
      },
      include: { rubric: true, stage: true },
    });
    return { results, evaluations, unpublishedHidden: unpublished };
  }

  async myResultsOr403(user: AuthUser, teamId: string) {
    const data = await this.myResults(user, teamId);
    if (!canStudentViewResults(data.results.length > 0)) {
      throw new ForbiddenException('Results are not published yet');
    }
    return data;
  }
}
