import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StageProgressStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { nextVersion } from '../../domain/rules';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { consumeToken } from '../../lib/rate-limit';
import { createPresignedPutUrl, isS3Configured, normalizeUploadMime, putObjectBuffer } from '../../lib/s3';
import { requestVirusScan } from '../../lib/scan';
import { TeamsService } from '../teams/service';
import {
  createRubricSchema,
  createStageSchema,
  deliverableSchema,
  directUploadSchema,
  presignSchema,
  statusPatchSchema,
} from './schema';

@Injectable()
export class StagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  list() {
    return this.prisma.stage.findMany({ orderBy: { sequence: 'asc' }, include: { rubrics: true } });
  }

  create(body: z.infer<typeof createStageSchema>) {
    return this.prisma.stage.create({
      data: { name: body.name, sequence: body.sequence, deadline: new Date(body.deadline) },
    });
  }

  async update(id: string, body: Partial<z.infer<typeof createStageSchema>>) {
    const stage = await this.prisma.stage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    return this.prisma.stage.update({
      where: { id },
      data: {
        name: body.name,
        sequence: body.sequence,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
    });
  }

  async deactivate(id: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    return this.prisma.stage.update({ where: { id }, data: { isActive: false } });
  }

  async addRubric(stageId: string, body: z.infer<typeof createRubricSchema>) {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId }, include: { rubrics: true } });
    if (!stage) throw new NotFoundException('Stage not found');
    const sum = stage.rubrics.reduce((acc, r) => acc + Number(r.weightage), 0) + body.weightage;
    if (sum > 100.01) {
      throw new ForbiddenException('Rubric weightages cannot exceed 100 for a stage');
    }
    return this.prisma.rubric.create({
      data: { stageId, criteria: body.criteria, weightage: body.weightage },
    });
  }

  async presign(user: AuthUser, stageId: string, body: z.infer<typeof presignSchema>) {
    await consumeToken(`upload:${body.teamId}`, Number(process.env.UPLOAD_RATE_LIMIT_PER_MIN ?? 20));
    await this.teams.assertTeamAccess(user, body.teamId);
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.deadline.getTime() < Date.now()) {
      throw new HttpException('Stage is locked after deadline', 423);
    }
    const contentType = normalizeUploadMime(body.filename, body.contentType);
    const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `deliverables/${body.teamId}/${stageId}/${body.kind}/${Date.now()}-${safeName}`;
    try {
      return await createPresignedPutUrl(key, contentType, body.contentLength);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Could not create upload URL');
    }
  }

  /** Upload PPTX/PDF through the API so the browser never talks to S3 directly (avoids CORS hangs). */
  async uploadDirect(user: AuthUser, stageId: string, body: z.infer<typeof directUploadSchema>) {
    await consumeToken(`upload:${body.teamId}`, Number(process.env.UPLOAD_RATE_LIMIT_PER_MIN ?? 20));
    await this.teams.assertTeamAccess(user, body.teamId);
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.deadline.getTime() < Date.now()) {
      throw new HttpException('Stage is locked after deadline', 423);
    }

    const filename = body.filename.trim();
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
    if (!['.pdf', '.ppt', '.pptx'].includes(ext)) {
      throw new BadRequestException('Only PDF or PPTX files are allowed');
    }

    const contentType = normalizeUploadMime(filename, body.contentType);
    let buffer: Buffer;
    try {
      const raw = body.dataBase64.includes(',') ? body.dataBase64.split(',').pop()! : body.dataBase64;
      buffer = Buffer.from(raw, 'base64');
    } catch {
      throw new BadRequestException('Invalid file payload');
    }
    if (!buffer.length) throw new BadRequestException('Empty file');
    if (buffer.length > 20 * 1024 * 1024) {
      throw new BadRequestException('File exceeds the 20MB upload limit');
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `deliverables/${body.teamId}/${stageId}/ppt/${Date.now()}-${safeName}`;
    let fileUrl: string;
    if (isS3Configured()) {
      const stored = await putObjectBuffer(key, buffer, contentType);
      fileUrl = stored.publicUrl;
    } else if (buffer.length <= 5 * 1024 * 1024) {
      // Local/dev fallback when object storage is not configured.
      fileUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    } else {
      throw new BadRequestException('File storage is not configured (set S3_BUCKET) for files over 5MB');
    }

    return this.submitDeliverable(user, stageId, {
      teamId: body.teamId,
      pptUrl: fileUrl,
    });
  }

  async submitDeliverable(user: AuthUser, stageId: string, body: z.infer<typeof deliverableSchema>) {
    const team = await this.teams.assertTeamAccess(user, body.teamId);
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.deadline.getTime() < Date.now()) {
      throw new HttpException('Stage is locked after deadline', 423);
    }
    const prev = await this.prisma.deliverable.findFirst({
      where: { teamId: body.teamId, stageId },
      orderBy: { version: 'desc' },
    });
    if (prev?.locked) {
      throw new HttpException('Deliverables are locked for this stage', 423);
    }
    const scanStatus = await requestVirusScan(
      body.pptUrl ?? body.reportUrl ?? body.videoUrl ?? `deliverables/${body.teamId}/${stageId}`,
    );
    const row = await this.prisma.deliverable.create({
      data: {
        teamId: body.teamId,
        stageId,
        pptUrl: body.pptUrl,
        reportUrl: body.reportUrl,
        videoUrl: body.videoUrl,
        githubUrl: body.githubUrl,
        version: nextVersion(prev?.version),
        locked: false,
        scanStatus,
      },
    });
    await this.prisma.teamStageStatus.upsert({
      where: { teamId_stageId: { teamId: team.id, stageId } },
      create: { teamId: team.id, stageId, status: StageProgressStatus.submitted },
      update: { status: StageProgressStatus.submitted },
    });
    return row;
  }

  async deleteDeliverable(user: AuthUser, stageId: string, deliverableId: string) {
    const row = await this.prisma.deliverable.findFirst({
      where: { id: deliverableId, stageId },
    });
    if (!row) throw new NotFoundException('Deliverable not found');
    const team = await this.teams.assertTeamAccess(user, row.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can delete deliverables');
    }
    if (row.locked) {
      throw new HttpException('Deliverable is locked and cannot be deleted', 423);
    }
    await this.prisma.deliverable.delete({ where: { id: deliverableId } });
    return { deleted: true };
  }

  async statusTracker(user: AuthUser, teamId: string) {
    await this.teams.assertTeamAccess(user, teamId);
    const stages = await this.prisma.stage.findMany({ orderBy: { sequence: 'asc' } });
    const statuses = await this.prisma.teamStageStatus.findMany({ where: { teamId } });
    const byStage = new Map(statuses.map((s) => [s.stageId, s]));
    return stages.map((stage) => ({
      stage,
      status: byStage.get(stage.id)?.status ?? StageProgressStatus.not_started,
      updatedAt: byStage.get(stage.id)?.updatedAt ?? null,
    }));
  }

  async patchStatus(user: AuthUser, teamId: string, stageId: string, body: z.infer<typeof statusPatchSchema>) {
    await this.teams.assertTeamAccess(user, teamId);
    const updated = await this.prisma.teamStageStatus.upsert({
      where: { teamId_stageId: { teamId, stageId } },
      create: { teamId, stageId, status: body.status },
      update: { status: body.status },
    });
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    const memberIds = team?.members.map((m) => m.userId).filter((id): id is string => Boolean(id)) ?? [];
    await notifyUsers(this.prisma, memberIds, {
      type: 'status_change',
      template: 'status_change',
      title: `Stage status updated: ${stage?.name ?? 'stage'}`,
      body: `Your team status is now ${body.status.replace('_', ' ')}.`,
      relatedEntity: `team:${teamId}`,
    });
    return updated;
  }

  async lockExpiredStages() {
    const now = new Date();
    const stages = await this.prisma.stage.findMany({ where: { deadline: { lte: now }, isActive: true } });
    let locked = 0;
    for (const stage of stages) {
      const res = await this.prisma.deliverable.updateMany({
        where: { stageId: stage.id, locked: false },
        data: { locked: true },
      });
      locked += res.count;
    }
    return { stages: stages.length, deliverablesLocked: locked };
  }
}
