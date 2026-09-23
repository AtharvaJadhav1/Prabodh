import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { sendStaffCredentialsEmail } from '../../lib/invite-email';
import { deriveStaffPassword } from '../../lib/staff-password';
import { fireAndForget, mapPool } from '../../lib/async-pool';
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
          mentorAssignments: { where: { active: true }, include: { mentor: true, industrialMentor: true } },
          _count: { select: { members: true } },
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
      orderBy: [{ createdAt: 'desc' }, { fullName: 'asc' }],
      take: 2000,
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
    const password = deriveStaffPassword(body.email);
    const user = await this.identity.createStaffAccount({
      email: body.email,
      password,
      fullName: body.fullName,
      platformRole: body.platformRole as PlatformRole,
      institute: body.institute,
      department: body.department,
    });
    // Email after DB write — do not block the admin UI on Resend latency.
    void sendStaffCredentialsEmail({
      to: user.email,
      fullName: user.fullName,
      password,
      platformRole: user.platformRole,
    }).catch((err) => {
      console.error('[admin.inviteStaff] email failed for', user.email, err);
    });
    return {
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
      emailSent: true,
      emailError: null,
    };
  }

  async queueImport(admin: AuthUser, csv: string) {
    const parsed = parseCsvUsers(csv);
    if (parsed.length > 2000) {
      throw new BadRequestException('CSV import is limited to 2000 rows per batch');
    }

    const batch = await this.prisma.userImportBatch.create({
      data: {
        adminUserId: admin.id,
        status: 'pending_review',
        rowCount: parsed.length,
      },
    });

    // Chunked inserts so large CSVs (500+) do not blow one nested create.
    const chunkSize = 100;
    for (let i = 0; i < parsed.length; i += chunkSize) {
      const slice = parsed.slice(i, i + chunkSize);
      await this.prisma.userImportRow.createMany({
        data: slice.map((r) => ({
          batchId: batch.id,
          email: r.email.toLowerCase(),
          fullName: r.fullName,
          platformRole: r.platformRole,
          institute: r.institute,
          department: r.department,
        })),
      });
    }

    return {
      id: batch.id,
      status: batch.status,
      rowCount: parsed.length,
      createdAt: batch.createdAt,
    };
  }

  getImport(id: string) {
    return this.prisma.userImportBatch.findUnique({ where: { id }, include: { rows: true } });
  }

  async getImportStatus(id: string) {
    const batch = await this.prisma.userImportBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Import batch not found');
    const grouped = await this.prisma.userImportRow.groupBy({
      by: ['status'],
      where: { batchId: id },
      _count: true,
    });
    const counts = { pending: 0, activated: 0, failed: 0, skipped: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count;
    }
    return {
      id: batch.id,
      status: batch.status,
      rowCount: batch.rowCount,
      counts,
      done: batch.status === 'activated' || batch.status === 'rejected',
    };
  }

  async rejectImport(id: string) {
    return this.prisma.userImportBatch.update({ where: { id }, data: { status: 'rejected' } });
  }

  /**
   * Queue activation and return immediately. Heavy work (user create + emails)
   * runs in the background so 500-row batches do not time out the HTTP request.
   */
  async activateImport(id: string) {
    const batch = await this.prisma.userImportBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Import batch not found');
    if (batch.status === 'activated' || batch.status === 'processing') {
      return this.getImportStatus(id);
    }
    if (batch.status !== 'pending_review') {
      throw new NotFoundException('Import batch not pending review');
    }

    const claimed = await this.prisma.userImportBatch.updateMany({
      where: { id, status: 'pending_review' },
      data: { status: 'processing' },
    });
    if (claimed.count === 0) {
      return this.getImportStatus(id);
    }

    fireAndForget(`admin.import-activate:${id}`, () => this.processImportActivation(id));
    return {
      id,
      status: 'processing' as const,
      rowCount: batch.rowCount,
      queued: true,
      message: 'Import is processing in the background. Poll status until activated.',
    };
  }

  /** Chunked create + background credential emails. Safe for ~500–2000 rows. */
  async processImportActivation(id: string) {
    const batch = await this.prisma.userImportBatch.findUnique({
      where: { id },
      include: { rows: true },
    });
    if (!batch || batch.status !== 'processing') return;

    const staffRoles = new Set<PlatformRole>([
      PlatformRole.institute_mentor,
      PlatformRole.industry_mentor,
      PlatformRole.admin,
    ]);

    const credentialJobs: Array<{
      email: string;
      fullName: string;
      password: string;
      platformRole: PlatformRole;
    }> = [];

    try {
      const chunkSize = 50;
      for (let i = 0; i < batch.rows.length; i += chunkSize) {
        const slice = batch.rows.slice(i, i + chunkSize);
        const prepared = slice.map((r) => {
          const needsCredentials = staffRoles.has(r.platformRole);
          const password = needsCredentials ? deriveStaffPassword(r.email) : undefined;
          return {
            email: r.email,
            fullName: r.fullName,
            platformRole: r.platformRole,
            institute: r.institute ?? undefined,
            department: r.department ?? undefined,
            password,
          };
        });

        const results = await this.identity.bulkCreate(prepared);

        await mapPool(results, 10, async (result) => {
          await this.prisma.userImportRow.updateMany({
            where: { batchId: id, email: result.email.toLowerCase() },
            data: {
              status: result.status === 'created' ? 'activated' : 'failed',
              error: 'error' in result ? result.error : undefined,
            },
          });
        });

        for (const result of results) {
          if (result.status !== 'created' || !result.password) continue;
          const src = prepared.find((p) => p.email.toLowerCase() === result.email.toLowerCase());
          if (!src?.password) continue;
          credentialJobs.push({
            email: result.email.toLowerCase(),
            fullName: src.fullName,
            password: src.password,
            platformRole: src.platformRole,
          });
        }
      }

      await this.prisma.userImportBatch.update({
        where: { id },
        data: { status: 'activated' },
      });
    } catch (err) {
      console.error('[admin.processImportActivation] failed', id, err);
      await this.prisma.userImportBatch.update({
        where: { id },
        data: { status: 'rejected' },
      }).catch(() => undefined);
      throw err;
    }

    if (credentialJobs.length) {
      // Slow email drain after DB work — keeps Resend from melting the API process.
      fireAndForget(`admin.bulk-credentials:${id}`, async () => {
        await mapPool(credentialJobs, 2, async (job) => {
          try {
            await sendStaffCredentialsEmail({
              to: job.email,
              fullName: job.fullName,
              password: job.password,
              platformRole: job.platformRole,
            });
          } catch (err) {
            console.error('[admin.bulk-credentials] failed for', job.email, err);
          }
        });
      });
    }
  }

  /**
   * Removes demo users/teams created by prisma/seed.ts.
   * Keeps admin@institute.edu.
   */
  async clearSeedData(confirm: string) {
    if (confirm !== 'DELETE_SEED_DATA') {
      throw new BadRequestException('Pass confirm=DELETE_SEED_DATA to proceed');
    }

    const keepEmails = ['admin@institute.edu'];
    const seedEmails = [
      'aarav.sharma@mituniversity.edu.in',
      'diya.patil@mituniversity.edu.in',
      'kabir.deshmukh@mituniversity.edu.in',
      'ananya.iyer@mituniversity.edu.in',
      'rohan.kulkarni@mituniversity.edu.in',
      'meera.nair@mituniversity.edu.in',
      'ishaan.joshi@mituniversity.edu.in',
      'sara.khan@mituniversity.edu.in',
      'dev.more@mituniversity.edu.in',
      'priya.bhosale@mituniversity.edu.in',
      'arjun.rao@mituniversity.edu.in',
      'nisha.gupta@mituniversity.edu.in',
      'vivek.sawant@mituniversity.edu.in',
      'tanya.mehta@mituniversity.edu.in',
      'leader@institute.edu',
      'newlead@institute.edu',
      'newlead2@institute.edu',
      'newstudent@institute.edu',
      'faculty@institute.edu',
      'newmentor@institute.edu',
      'neha.kulkarni@mituniversity.edu.in',
      'rajesh.patil@mituniversity.edu.in',
      'sunita.desai@mituniversity.edu.in',
      'amit.joshi@mituniversity.edu.in',
      'kavita.shinde@mituniversity.edu.in',
      'sanjay.verma@mituniversity.edu.in',
      'industry@partner.com',
      'leena.kapoor@partnertech.in',
      'test.mentor@mituniversity.edu.in',
      'test.leader@mituniversity.edu.in',
    ];
    const seedTeamCodes = ['DEMO01', 'DEMO02', 'DEMO03'];

    const seedUsers = await this.prisma.user.findMany({
      where: {
        AND: [
          { NOT: { email: { in: keepEmails } } },
          {
            OR: [
              { clerkUserId: { startsWith: 'seed:' } },
              { clerkUserId: 'dev_admin' },
              { email: { in: seedEmails } },
              { email: { endsWith: '@prabodh.test' } },
              { email: { endsWith: '@institute.edu' } },
              { email: { endsWith: '@partner.com' } },
              { email: { endsWith: '@partnertech.in' } },
              { email: { contains: 'bulk500.' } },
              { email: { contains: 'bulk.invite.' } },
              { email: { contains: 'ui.bulk.' } },
              { email: { contains: 'probe.async.' } },
              // Seed faculty/students used @mituniversity.edu.in with seed: clerk ids —
              // also catch leftover MIT demo accounts that match known seed names.
              {
                AND: [
                  { email: { endsWith: '@mituniversity.edu.in' } },
                  {
                    OR: [
                      { clerkUserId: { startsWith: 'seed:' } },
                      { email: { in: seedEmails } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      select: { id: true, email: true },
    });
    const seedUserIds = seedUsers.map((u) => u.id);
    const seedTeams = await this.prisma.team.findMany({
      where: {
        OR: [
          { teamCode: { in: seedTeamCodes } },
          { teamCode: { startsWith: 'DEMO' } },
          { clerkOrgId: { startsWith: 'local-org-DEMO' } },
          ...(seedUserIds.length ? [{ leaderUserId: { in: seedUserIds } }] : []),
        ],
      },
      select: { id: true, teamCode: true },
    });
    const seedTeamIds = [...new Set(seedTeams.map((t) => t.id))];

    await this.prisma.$transaction(
      async (tx) => {
        if (seedTeamIds.length) {
          await tx.comment.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.evaluation.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.stageResult.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.deliverable.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.teamStageStatus.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.teamPsPreference.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.ideaSubmission.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.mentorInvite.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.mentorAssignment.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.joinRequest.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.teamMember.deleteMany({ where: { teamId: { in: seedTeamIds } } });
          await tx.team.updateMany({
            where: { id: { in: seedTeamIds } },
            data: { industrialMentorId: null, facultyMentorId: null, psId: null },
          });
          await tx.team.deleteMany({ where: { id: { in: seedTeamIds } } });
        }

        if (seedUserIds.length) {
          await tx.team.updateMany({
            where: { facultyMentorId: { in: seedUserIds } },
            data: { facultyMentorId: null },
          });
          const industrial = await tx.industrialMentor.findMany({
            where: { userId: { in: seedUserIds } },
            select: { id: true },
          });
          const industrialIds = industrial.map((i) => i.id);
          if (industrialIds.length) {
            await tx.team.updateMany({
              where: { industrialMentorId: { in: industrialIds } },
              data: { industrialMentorId: null },
            });
            await tx.mentorAssignment.updateMany({
              where: { industrialMentorId: { in: industrialIds } },
              data: { industrialMentorId: null },
            });
          }

          await tx.comment.deleteMany({ where: { authorUserId: { in: seedUserIds } } });
          await tx.notification.deleteMany({ where: { userId: { in: seedUserIds } } });
          await tx.notificationLog.deleteMany({ where: { recipientUserId: { in: seedUserIds } } });
          await tx.broadcast.deleteMany({ where: { adminUserId: { in: seedUserIds } } });
          await tx.auditLog.deleteMany({ where: { actorUserId: { in: seedUserIds } } });
          await tx.evaluation.deleteMany({ where: { evaluatorUserId: { in: seedUserIds } } });
          await tx.stageResult.updateMany({
            where: { publishedById: { in: seedUserIds } },
            data: { publishedById: null },
          });
          await tx.mentorInvite.deleteMany({
            where: {
              OR: [{ invitedById: { in: seedUserIds } }, { mentorUserId: { in: seedUserIds } }],
            },
          });
          await tx.mentorAssignment.deleteMany({
            where: {
              OR: [{ mentorUserId: { in: seedUserIds } }, { assignedById: { in: seedUserIds } }],
            },
          });
          await tx.joinRequest.deleteMany({ where: { studentId: { in: seedUserIds } } });
          await tx.teamMember.deleteMany({ where: { userId: { in: seedUserIds } } });
          await tx.teamPsPreference.deleteMany({
            where: {
              OR: [{ submittedById: { in: seedUserIds } }, { decidedById: { in: seedUserIds } }],
            },
          });
          await tx.ideaSubmission.updateMany({
            where: { authorUserId: { in: seedUserIds } },
            data: { authorUserId: null },
          });
          await tx.industrialMentor.deleteMany({ where: { userId: { in: seedUserIds } } });
          await tx.userImportBatch.deleteMany({ where: { adminUserId: { in: seedUserIds } } });

          const leftoverTeams = await tx.team.findMany({
            where: { leaderUserId: { in: seedUserIds } },
            select: { id: true },
          });
          if (leftoverTeams.length) {
            const ids = leftoverTeams.map((t) => t.id);
            await tx.comment.deleteMany({ where: { teamId: { in: ids } } });
            await tx.evaluation.deleteMany({ where: { teamId: { in: ids } } });
            await tx.stageResult.deleteMany({ where: { teamId: { in: ids } } });
            await tx.deliverable.deleteMany({ where: { teamId: { in: ids } } });
            await tx.teamStageStatus.deleteMany({ where: { teamId: { in: ids } } });
            await tx.teamPsPreference.deleteMany({ where: { teamId: { in: ids } } });
            await tx.ideaSubmission.deleteMany({ where: { teamId: { in: ids } } });
            await tx.mentorInvite.deleteMany({ where: { teamId: { in: ids } } });
            await tx.mentorAssignment.deleteMany({ where: { teamId: { in: ids } } });
            await tx.joinRequest.deleteMany({ where: { teamId: { in: ids } } });
            await tx.teamMember.deleteMany({ where: { teamId: { in: ids } } });
            await tx.team.updateMany({
              where: { id: { in: ids } },
              data: { industrialMentorId: null, facultyMentorId: null, psId: null },
            });
            await tx.team.deleteMany({ where: { id: { in: ids } } });
          }

          await tx.user.deleteMany({ where: { id: { in: seedUserIds } } });
        }

        await tx.problemStatement.deleteMany({
          where: { code: { startsWith: 'SIH2026-CS-' } },
        });
      },
      { timeout: 120_000 },
    );

    return {
      deletedUsers: seedUsers.length,
      deletedTeams: seedTeamIds.length,
      deletedEmails: seedUsers.map((u) => u.email),
      deletedTeamCodes: seedTeams.map((t) => t.teamCode),
      keptAdmin: 'admin@institute.edu',
      totals: {
        users: await this.prisma.user.count(),
        teams: await this.prisma.team.count(),
      },
    };
  }
}

function avatarUrlOf(profileJson: Prisma.JsonValue | null): string | null {
  const value =
    profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? (profileJson as Record<string, unknown>).avatarUrl
      : undefined;
  return typeof value === 'string' && value ? value : null;
}
