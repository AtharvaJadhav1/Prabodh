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
import { resolveDeliverableRow } from '../../lib/deliverable-url';
import {
  createPresignedPutUrl,
  getObjectSize,
  isS3Configured,
  normalizeUploadMime,
  putObjectBuffer,
} from '../../lib/s3';
import { requestVirusScan } from '../../lib/scan';
import { TtlCache } from '../../lib/ttl-cache';
import { TeamsService } from '../teams/service';
import {
  createRubricSchema,
  createStageSchema,
  deliverableSchema,
  directUploadSchema,
  presignSchema,
  statusPatchSchema,
} from './schema';

const stagesListCache = new TtlCache<unknown>(30_000);

const MAX_DELIVERABLE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DELIVERABLE_TOTAL_BYTES = 10 * 1024 * 1024;

@Injectable()
export class StagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  async list() {
    const cached = stagesListCache.get('all');
    if (cached) return cached;
    const rows = await this.prisma.stage.findMany({
      orderBy: { sequence: 'asc' },
      select: {
        id: true,
        name: true,
        sequence: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        rubrics: {
          select: { id: true, stageId: true, criteria: true, weightage: true, createdAt: true, updatedAt: true },
        },
      },
    });
    stagesListCache.set('all', rows);
    return rows;
  }

  async create(body: z.infer<typeof createStageSchema>) {
    const created = await this.prisma.stage.create({
      data: { name: body.name, sequence: body.sequence },
    });
    stagesListCache.clear();
    return created;
  }

  async update(id: string, body: Partial<z.infer<typeof createStageSchema>>) {
    const stage = await this.prisma.stage.findUnique({ where: { id }, select: { id: true } });
    if (!stage) throw new NotFoundException('Stage not found');
    const updated = await this.prisma.stage.update({
      where: { id },
      data: {
        name: body.name,
        sequence: body.sequence,
      },
    });
    stagesListCache.clear();
    return updated;
  }

  async deactivate(id: string) {
    const stage = await this.prisma.stage.findUnique({ where: { id }, select: { id: true } });
    if (!stage) throw new NotFoundException('Stage not found');
    const updated = await this.prisma.stage.update({ where: { id }, data: { isActive: false } });
    stagesListCache.clear();
    return updated;
  }

  async addRubric(stageId: string, body: z.infer<typeof createRubricSchema>) {
    const stage = await this.prisma.stage.findUnique({
      where: { id: stageId },
      select: { id: true, rubrics: { select: { weightage: true } } },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    const sum = stage.rubrics.reduce((acc, r) => acc + Number(r.weightage), 0) + body.weightage;
    if (sum > 100.01) {
      throw new ForbiddenException('Rubric weightages cannot exceed 100 for a stage');
    }
    const created = await this.prisma.rubric.create({
      data: { stageId, criteria: body.criteria, weightage: body.weightage },
    });
    stagesListCache.clear();
    return created;
  }

  async presign(user: AuthUser, stageId: string, body: z.infer<typeof presignSchema>) {
    await consumeToken(`upload:${body.teamId}`, Number(process.env.UPLOAD_RATE_LIMIT_PER_MIN ?? 20));
    this.teams.assertTeamMutable(await this.teams.assertTeamAccess(user, body.teamId));
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
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
    const team = await this.teams.assertTeamAccess(user, body.teamId);
    this.teams.assertTeamMutable(team);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can upload deliverables');
    }
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');

    const kind = body.kind;
    const filename = body.filename.trim();
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
    const allowedExt = kind === 'ppt' ? ['.ppt', '.pptx'] : ['.pdf', '.docx'];
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(
        kind === 'ppt' ? 'Presentation must be a PPT or PPTX file' : 'Report must be a PDF or DOCX file',
      );
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

    // One deliverable row per stage holds both documents; each is capped at 5MB.
    const existing = await this.prisma.deliverable.findFirst({
      where: { teamId: body.teamId, stageId },
      orderBy: { version: 'desc' },
    });
    if (existing?.locked) {
      throw new HttpException('Deliverables are locked for this stage', 423);
    }
    if (buffer.length > MAX_DELIVERABLE_FILE_BYTES) {
      throw new BadRequestException('Each file must not exceed 5MB');
    }

    // Check combined total if the other file already exists
    if (existing) {
      const otherKey = kind === 'ppt'
        ? `deliverables/${body.teamId}/${stageId}/report/${existing.reportUrl?.split('/').pop() ?? ''}`
        : `deliverables/${body.teamId}/${stageId}/ppt/${existing.pptUrl?.split('/').pop() ?? ''}`;
      let otherSize = 0;
      if (isS3Configured() && existing.reportUrl) {
        otherSize = await getObjectSize(otherKey) ?? 0;
      } else if (!isS3Configured() && existing.reportUrl) {
        // For data URLs, extract base64 length
        const base64 = existing.reportUrl?.split(',')[1] ?? '';
        otherSize = Math.floor(base64.length * 0.75);
      }
      const totalSize = buffer.length + otherSize;
      if (totalSize > MAX_DELIVERABLE_TOTAL_BYTES) {
        throw new BadRequestException('Combined upload size would exceed 10MB limit');
      }
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `deliverables/${body.teamId}/${stageId}/${kind}/${Date.now()}-${safeName}`;
    let fileUrl: string;
    if (isS3Configured()) {
      const stored = await putObjectBuffer(key, buffer, contentType);
      fileUrl = stored.publicUrl;
    } else {
      // Local/dev fallback when object storage is not configured (each file is capped at 5MB).
      fileUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    }

    const urls =
      kind === 'ppt'
        ? { pptUrl: fileUrl, pptFileName: filename }
        : { reportUrl: fileUrl, reportFileName: filename };
    if (existing) {
      const scanStatus = await requestVirusScan(fileUrl);
      const row = await this.prisma.deliverable.update({
        where: { id: existing.id },
        data: { ...urls, scanStatus, submittedAt: new Date() },
      });
      return resolveDeliverableRow(row);
    }
    const row = await this.submitDeliverable(user, stageId, { teamId: body.teamId, ...urls });
    return resolveDeliverableRow(row);
  }

  async submitDeliverable(user: AuthUser, stageId: string, body: z.infer<typeof deliverableSchema>) {
    const team = await this.teams.assertTeamAccess(user, body.teamId);
    this.teams.assertTeamMutable(team);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can submit deliverables');
    }
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
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
        pptFileName: body.pptFileName,
        reportFileName: body.reportFileName,
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
    return resolveDeliverableRow(row);
  }

  async deleteDeliverable(user: AuthUser, stageId: string, deliverableId: string) {
    const row = await this.prisma.deliverable.findFirst({
      where: { id: deliverableId, stageId },
    });
    if (!row) throw new NotFoundException('Deliverable not found');
    const team = await this.teams.assertTeamAccess(user, row.teamId);
    this.teams.assertTeamMutable(team);
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
    this.teams.assertTeamMutable(await this.teams.assertTeamAccess(user, teamId));
    const [stages, statuses] = await Promise.all([
      this.list() as Promise<
        Array<{
          id: string;
          name: string;
          sequence: number;
          isActive: boolean;
          createdAt: Date;
          updatedAt: Date;
          rubrics: unknown[];
        }>
      >,
      this.prisma.teamStageStatus.findMany({
        where: { teamId },
        select: { stageId: true, status: true, updatedAt: true },
      }),
    ]);
    const byStage = new Map(statuses.map((s) => [s.stageId, s]));
    return stages.map((stage) => {
      const { rubrics: _rubrics, ...stageRow } = stage;
      return {
        stage: stageRow,
        status: byStage.get(stage.id)?.status ?? StageProgressStatus.not_started,
        updatedAt: byStage.get(stage.id)?.updatedAt ?? null,
      };
    });
  }

  async patchStatus(user: AuthUser, teamId: string, stageId: string, body: z.infer<typeof statusPatchSchema>) {
    this.teams.assertTeamMutable(await this.teams.assertTeamAccess(user, teamId));
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
}
