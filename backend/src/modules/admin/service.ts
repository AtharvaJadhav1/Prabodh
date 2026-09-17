import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { sendStaffCredentialsEmail } from '../../lib/invite-email';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { DEFAULT_SETTINGS } from '../../domain/rules';
import { parsePagination } from '../../common/pagination';
import { PrismaService } from '../../lib/prisma.service';
import { exportQueue } from '../../lib/queue';
import { createPresignedGetUrl } from '../../lib/s3';
import { upsertSetting } from '../../lib/settings';
import { IdentityService, parseCsvUsers } from '../identity/service';
import { adminInviteUserSchema, exportSchema, settingsSchema } from './schema';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
  ) {}

  async dashboard() {
    const [teams, byStatus, submissions, allocations, stages] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.team.groupBy({ by: ['status'], _count: true }),
      this.prisma.ideaSubmission.groupBy({ by: ['status'], _count: true }),
      this.prisma.mentorAssignment.count({ where: { active: true } }),
      this.prisma.stage.findMany({
        orderBy: { sequence: 'asc' },
        include: { _count: { select: { deliverables: true, stageStatuses: true } } },
      }),
    ]);
    const teamsMissingMentor = await this.prisma.team.count({
      where: {
        status: { not: 'disqualified' },
        OR: [
          { mentorAssignments: { none: { mentorType: 'institute', active: true } } },
          { mentorAssignments: { none: { mentorType: 'industry', active: true } } },
        ],
      },
    });
    return {
      totalTeams: teams,
      teamsByStatus: byStatus,
      ideaSubmissions: submissions,
      activeMentorAssignments: allocations,
      teamsMissingMentor,
      stageFunnel: stages.map((s) => ({
        id: s.id,
        name: s.name,
        sequence: s.sequence,
        deliverables: s._count.deliverables,
        tracked: s._count.stageStatuses,
      })),
    };
  }

  async listTeams(query: {
    theme?: string;
    institute?: string;
    mentor?: string;
    status?: string;
    department?: string;
    page?: string;
    limit?: string;
  }) {
    const { page, limit, skip, take } = parsePagination(query);
    const where: Prisma.TeamWhereInput = {
      ...(query.theme ? { theme: { contains: query.theme, mode: 'insensitive' } } : {}),
      ...(query.institute ? { institute: { contains: query.institute, mode: 'insensitive' } } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.mentor
        ? { mentorAssignments: { some: { active: true, mentor: { fullName: { contains: query.mentor, mode: 'insensitive' } } } } }
        : {}),
      ...(query.department
        ? { members: { some: { user: { department: { contains: query.department, mode: 'insensitive' } } } } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          leader: true,
          problemStatement: true,
          mentorAssignments: { where: { active: true }, include: { mentor: true } },
        },
      }),
      this.prisma.team.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  listMentors() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        platformRole: { in: ['institute_mentor', 'industry_mentor'] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        platformRole: true,
        domainTags: true,
        institute: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  listUsers(role?: string) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(role ? { platformRole: role as never } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        platformRole: true,
        institute: true,
        department: true,
        profileJson: true,
      },
      orderBy: { fullName: 'asc' },
      take: 500,
    }).then((rows) =>
      rows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        platformRole: u.platformRole,
        institute: u.institute,
        department: u.department,
        avatarUrl: avatarUrlOf(u.profileJson),
      })),
    );
  }

  async enqueueExport(admin: AuthUser, body: z.infer<typeof exportSchema>) {
    const job = await this.prisma.exportJob.create({
      data: {
        adminUserId: admin.id,
        format: body.format,
        dataset: body.dataset,
        status: 'queued',
      },
    });
    await exportQueue().add('export', { jobId: job.id, format: body.format, dataset: body.dataset });
    return job;
  }

  async exportStatus(jobId: string) {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) return null;
    let downloadUrl: string | null = null;
    if (job.status === 'complete' && job.fileKey) {
      if (job.fileKey.startsWith('local:')) {
        downloadUrl = `/api/admin/export/${jobId}/file`;
      } else {
        try {
          downloadUrl = await createPresignedGetUrl(job.fileKey);
        } catch {
          downloadUrl = null;
        }
      }
    }
    return { ...job, downloadUrl };
  }

  localExportPath(jobId: string) {
    const jobDir = join(process.cwd(), 'storage', 'exports');
    const xlsx = join(jobDir, `${jobId}.xlsx`);
    const pdf = join(jobDir, `${jobId}.pdf`);
    if (existsSync(xlsx)) return { path: xlsx, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    if (existsSync(pdf)) return { path: pdf, type: 'application/pdf' };
    return null;
  }

  openLocalExport(jobId: string) {
    const found = this.localExportPath(jobId);
    if (!found) throw new NotFoundException('Export file not found');
    return { stream: createReadStream(found.path), type: found.type };
  }

  async listAudit(query: { page?: string; limit?: string; action?: string; entityType?: string }) {
    const { page, limit, skip, take } = parsePagination(query);
    const where = {
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true, fullName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async overdueReviews() {
    const now = new Date();
    return this.prisma.teamStageStatus.findMany({
      where: {
        status: { in: ['submitted', 'in_progress'] },
        stage: { deadline: { lte: now }, isActive: true },
      },
      include: {
        team: { include: { mentorAssignments: { where: { active: true }, include: { mentor: true } } } },
        stage: true,
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async getSettings() {
    const rows = await this.prisma.platformSetting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [key, Number(map[key] ?? fallback)]),
    );
  }

  async updateSettings(body: z.infer<typeof settingsSchema>) {
    const entries = Object.entries(body).filter(([, v]) => v != null);
    for (const [key, value] of entries) {
      await upsertSetting(this.prisma, key, String(value));
    }
    return this.getSettings();
  }

  async inviteStaff(admin: AuthUser, body: z.infer<typeof adminInviteUserSchema>) {
    const user = await this.identity.createStaffAccount({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      platformRole: body.platformRole as PlatformRole,
      institute: body.institute,
      department: body.department,
    });
    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendStaffCredentialsEmail({
        to: user.email,
        fullName: user.fullName,
        password: body.password,
        platformRole: user.platformRole,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Email delivery failed';
    }
    return {
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
      emailSent,
      emailError,
    };
  }

  async queueImport(admin: AuthUser, csv: string) {
    const parsed = parseCsvUsers(csv);
    const batch = await this.prisma.userImportBatch.create({
      data: {
        adminUserId: admin.id,
        status: 'pending_review',
        rowCount: parsed.length,
        rows: {
          create: parsed.map((r) => ({
            email: r.email.toLowerCase(),
            fullName: r.fullName,
            platformRole: r.platformRole,
            institute: r.institute,
            department: r.department,
          })),
        },
      },
      include: { rows: true },
    });
    return batch;
  }

  getImport(id: string) {
    return this.prisma.userImportBatch.findUnique({ where: { id }, include: { rows: true } });
  }

  async rejectImport(id: string) {
    return this.prisma.userImportBatch.update({ where: { id }, data: { status: 'rejected' } });
  }

  async activateImport(id: string) {
    const batch = await this.prisma.userImportBatch.findUnique({ where: { id }, include: { rows: true } });
    if (!batch || batch.status !== 'pending_review') {
      throw new NotFoundException('Import batch not pending review');
    }
    const results = await this.identity.bulkCreate(
      batch.rows.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        platformRole: r.platformRole,
        institute: r.institute ?? undefined,
        department: r.department ?? undefined,
      })),
    );
    for (const result of results) {
      await this.prisma.userImportRow.updateMany({
        where: { batchId: id, email: result.email.toLowerCase() },
        data: {
          status: result.status === 'created' ? 'activated' : 'failed',
          error: result.error,
        },
      });
    }
    return this.prisma.userImportBatch.update({
      where: { id },
      data: { status: 'activated' },
      include: { rows: true },
    });
  }
}

function avatarUrlOf(profileJson: Prisma.JsonValue | null): string | null {
  const value =
    profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? (profileJson as Record<string, unknown>).avatarUrl
      : undefined;
  return typeof value === 'string' && value ? value : null;
}
