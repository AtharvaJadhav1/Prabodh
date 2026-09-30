import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteStatus, PlatformRole, Prisma } from '@prisma/client';
import { sendStaffCredentialsEmail } from '../../lib/invite-email';
import { generateStaffPassword } from '../../lib/staff-password';
import { writeAudit } from '../../lib/audit';
import { CATEGORY_ACTIONS, enrichAuditRows } from '../../lib/audit-view';
import { fireAndForget, mapPool } from '../../lib/async-pool';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { DEFAULT_SETTINGS } from '../../domain/rules';
import { parsePagination } from '../../common/pagination';
import { PrismaService } from '../../lib/prisma.service';
import { exportQueue } from '../../lib/queue';
import { createPresignedGetUrl } from '../../lib/s3';
import { upsertSetting } from '../../lib/settings';
import { getClerkClient } from '../../lib/clerk';
import { syncTeamMentorPointers } from '../../lib/mentor-pointers';
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
    const { page, limit, skip, take } = parsePagination(query, 10_000);
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

  async reportSnapshot() {
    const [
      usersByRole,
      teams,
      psCount,
      psPool,
      activeAssignments,
      assignmentsByMentor,
      assignmentsByMethod,
      invitesByStatus,
      instituteMentors,
      industryProfiles,
      ideasByStatus,
      stages,
      publishedResults,
      stageStatuses,
      deliverablesByStage,
      teamsCreatedAt,
      deliverablesSubmittedAt,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['platformRole'], _count: true }),
      this.prisma.team.findMany({
        select: {
          id: true,
          name: true,
          teamCode: true,
          theme: true,
          institute: true,
          status: true,
          psId: true,
          problemStatement: {
            select: { theme: true, category: true, organisation: true },
          },
          _count: { select: { members: true } },
        },
      }),
      this.prisma.problemStatement.count(),
      this.prisma.problemStatement.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          theme: true,
          category: true,
          organisation: true,
          teamCap: true,
          teamsSelectedCount: true,
        },
      }),
      this.prisma.mentorAssignment.findMany({
        where: { active: true },
        select: { teamId: true, mentorType: true, assignmentMethod: true },
      }),
      this.prisma.mentorAssignment.groupBy({
        by: ['mentorUserId'],
        where: { active: true },
        _count: true,
      }),
      this.prisma.mentorAssignment.groupBy({
        by: ['assignmentMethod'],
        where: { active: true },
        _count: true,
      }),
      this.prisma.mentorInvite.groupBy({ by: ['inviteStatus'], _count: true }),
      this.prisma.user.findMany({
        where: { platformRole: PlatformRole.institute_mentor },
        select: { id: true, isActive: true },
      }),
      this.prisma.industrialMentor.findMany({
        select: { id: true, userId: true, isActive: true },
      }),
      this.prisma.ideaSubmission.groupBy({ by: ['status'], _count: true }),
      this.prisma.stage.findMany({
        orderBy: { sequence: 'asc' },
        select: { id: true, name: true, sequence: true, deadline: true, isActive: true },
      }),
      this.prisma.stageResult.findMany({
        where: { published: true },
        select: {
          teamId: true,
          stageId: true,
          weightedScore: true,
          team: { select: { id: true, name: true, teamCode: true } },
        },
      }),
      this.prisma.teamStageStatus.findMany({ select: { stageId: true, status: true } }),
      this.prisma.deliverable.groupBy({ by: ['stageId'], _count: true }),
      this.prisma.team.findMany({ select: { createdAt: true } }),
      this.prisma.deliverable.findMany({ select: { submittedAt: true } }),
    ]);

    const countBy = <K extends string>(map: Map<K, number>) =>
      [...map.entries()].map(([key, count]) => ({ key, count }));

    const roleCounts = new Map<string, number>();
    for (const r of usersByRole) roleCounts.set(r.platformRole, r._count);

    const byStatusMap = new Map<string, number>();
    const byPSTheme = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byInstitute = new Map<string, number>();
    const sizeBuckets = new Map<string, number>([
      ['1-2', 0],
      ['3-4', 0],
      ['5-6', 0],
      ['7+', 0],
    ]);
    let teamMembers = 0;
    let teamsWithoutPs = 0;

    for (const t of teams) {
      byStatusMap.set(t.status, (byStatusMap.get(t.status) ?? 0) + 1);
      const domain = t.problemStatement?.theme ?? 'No PS Assigned';
      byPSTheme.set(domain, (byPSTheme.get(domain) ?? 0) + 1);
      byCategory.set(t.problemStatement?.category ?? 'unassigned', (byCategory.get(t.problemStatement?.category ?? 'unassigned') ?? 0) + 1);
      if (t.institute) byInstitute.set(t.institute, (byInstitute.get(t.institute) ?? 0) + 1);
      const m = t._count.members ?? 0;
      teamMembers += m;
      const key = m <= 2 ? '1-2' : m <= 4 ? '3-4' : m <= 6 ? '5-6' : '7+';
      sizeBuckets.set(key, (sizeBuckets.get(key) ?? 0) + 1);
      if (!t.psId) teamsWithoutPs += 1;
    }

    const teamsWithInstitute = new Set<string>();
    const teamsWithIndustry = new Set<string>();
    for (const a of activeAssignments) {
      if (a.mentorType === 'institute') teamsWithInstitute.add(a.teamId);
      else teamsWithIndustry.add(a.teamId);
    }
    let withBoth = 0;
    let withInstituteOnly = 0;
    let withIndustryOnly = 0;
    let withNone = 0;
    for (const t of teams) {
      const hasInst = teamsWithInstitute.has(t.id);
      const hasInd = teamsWithIndustry.has(t.id);
      if (hasInst && hasInd) withBoth += 1;
      else if (hasInst) withInstituteOnly += 1;
      else if (hasInd) withIndustryOnly += 1;
      else withNone += 1;
    }

    const mentorLoad = new Map<string, number>();
    let totalActiveAssignments = 0;
    for (const g of assignmentsByMentor) {
      mentorLoad.set(g.mentorUserId, g._count);
      totalActiveAssignments += g._count;
    }
    const activeInstituteMentors = instituteMentors.filter((m) => m.isActive).length;
    const activeIndustryProfiles = industryProfiles.filter((p) => p.isActive).length;

    const methodSplit = new Map<string, number>();
    for (const g of assignmentsByMethod) methodSplit.set(g.assignmentMethod, g._count);
    const inviteFunnel = new Map<string, number>();
    for (const g of invitesByStatus) inviteFunnel.set(g.inviteStatus, g._count);

    const totalSlots = psPool.reduce((sum, ps) => sum + (ps.teamCap ?? 0), 0);
    const popularMap = new Map<string, number>();
    for (const t of teams) {
      if (t.psId) popularMap.set(t.psId, (popularMap.get(t.psId) ?? 0) + 1);
    }

    const byMethod = countBy(methodSplit);
    const byInviteStatus = countBy(inviteFunnel);
    const mentorLoadBuckets = new Map<string, number>([
      ['0', 0],
      ['1', 0],
      ['2-3', 0],
      ['4+', 0],
    ]);
    for (const [uid, count] of mentorLoad) {
      const key = count === 0 ? '0' : count === 1 ? '1' : count <= 3 ? '2-3' : '4+';
      void uid;
      mentorLoadBuckets.set(key, (mentorLoadBuckets.get(key) ?? 0) + 1);
    }
    const mentorsWithNoTeams = Math.max(0, activeInstituteMentors + activeIndustryProfiles - mentorLoad.size);

    const scoreByStage = new Map<string, { sum: number; count: number }>();
    let scoreSum = 0;
    let scoreCount = 0;
    const scoreDistribution = new Map<string, number>([
      ['0-20', 0],
      ['21-40', 0],
      ['41-60', 0],
      ['61-80', 0],
      ['81-100', 0],
    ]);
    const teamScoreAgg = new Map<string, { sum: number; count: number; name: string; teamCode: string }>();
    for (const r of publishedResults) {
      const score = Number(r.weightedScore);
      scoreSum += score;
      scoreCount += 1;
      const stageAgg = scoreByStage.get(r.stageId) ?? { sum: 0, count: 0 };
      stageAgg.sum += score;
      stageAgg.count += 1;
      scoreByStage.set(r.stageId, stageAgg);
      const bucket =
        score <= 20 ? '0-20' : score <= 40 ? '21-40' : score <= 60 ? '41-60' : score <= 80 ? '61-80' : '81-100';
      scoreDistribution.set(bucket, (scoreDistribution.get(bucket) ?? 0) + 1);
      const agg = teamScoreAgg.get(r.teamId) ?? { sum: 0, count: 0, name: r.team.name, teamCode: r.team.teamCode };
      agg.sum += score;
      agg.count += 1;
      teamScoreAgg.set(r.teamId, agg);
    }
    const topTeams = [...teamScoreAgg.entries()]
      .map(([teamId, agg]) => ({ teamId, name: agg.name, teamCode: agg.teamCode, avgScore: Math.round(agg.sum / agg.count) }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    const statusByStage = new Map<string, Map<string, number>>();
    for (const s of stageStatuses) {
      const stageMap = statusByStage.get(s.stageId) ?? new Map<string, number>();
      stageMap.set(s.status, (stageMap.get(s.status) ?? 0) + 1);
      statusByStage.set(s.stageId, stageMap);
    }
    const deliverablesByStageMap = new Map<string, number>();
    for (const d of deliverablesByStage) deliverablesByStageMap.set(d.stageId, d._count);

    const distribution = countBy(scoreDistribution);
    const popular = [...popularMap.entries()]
      .map(([psId, count]) => {
        const ps = psPool.find((p) => p.id === psId);
        return { code: ps?.code ?? psId, title: ps?.title ?? 'Unknown PS', count, capacity: ps?.teamCap ?? null };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const assignedPsTeams = [...popularMap.values()].reduce((sum, c) => sum + c, 0);

    const psByTheme = new Map<string, number>();
    const psByCategory = new Map<string, number>();
    const psByOrganisation = new Map<string, number>();
    for (const ps of psPool) {
      psByTheme.set(ps.theme, (psByTheme.get(ps.theme) ?? 0) + 1);
      psByCategory.set(ps.category, (psByCategory.get(ps.category) ?? 0) + 1);
      psByOrganisation.set(ps.organisation, (psByOrganisation.get(ps.organisation) ?? 0) + 1);
    }

    return {
      generatedAt: new Date().toISOString(),
      kpi: {
        totalUsers: [...roleCounts.values()].reduce((s, c) => s + c, 0),
        students: roleCounts.get('student') ?? 0,
        instituteMentors: roleCounts.get('institute_mentor') ?? 0,
        industryMentors: roleCounts.get('industry_mentor') ?? 0,
        experts: roleCounts.get('student_expert') ?? 0,
        admins: roleCounts.get('admin') ?? 0,
        totalTeams: teams.length,
        totalProblemStatements: psCount,
        totalIdeas: ideasByStatus.reduce((s, r) => s + r._count, 0),
        totalDeliverables: deliverablesSubmittedAt.length,
      },
      teams: {
        byStatus: countBy(byStatusMap),
        byPSTheme: countBy(byPSTheme).sort((a, b) => b.count - a.count),
        byCategory: countBy(byCategory).sort((a, b) => b.count - a.count),
        byInstitute: countBy(byInstitute).sort((a, b) => b.count - a.count).slice(0, 8),
        bySize: countBy(sizeBuckets),
        avgTeamSize: teams.length > 0 ? Math.round((teamMembers / teams.length) * 10) / 10 : 0,
        teamsWithoutPs: teamsWithoutPs,
      },
      psPool: {
        total: psCount,
        byTheme: countBy(psByTheme).sort((a, b) => b.count - a.count),
        byCategory: countBy(psByCategory).sort((a, b) => b.count - a.count),
        byOrganisation: countBy(psByOrganisation).sort((a, b) => b.count - a.count).slice(0, 8),
        totalSlots,
        filledTeams: assignedPsTeams,
        utilizationPct: totalSlots > 0 ? Math.round((assignedPsTeams / totalSlots) * 100) : 0,
        popular,
      },
      mentors: {
        activeInstituteMentors,
        activeIndustryMentors: activeIndustryProfiles,
        instituteMentorsWithTeams: mentorLoad.size,
        activeAssignments: totalActiveAssignments,
        avgTeamsPerMentor: mentorLoad.size > 0 ? Math.round((totalActiveAssignments / mentorLoad.size) * 10) / 10 : 0,
        mentorsWithNoTeams,
        loadBuckets: countBy(mentorLoadBuckets),
        byMethod,
        invites: byInviteStatus,
        coverage: { withBoth, withInstituteOnly, withIndustryOnly, withNone },
        industryProfilesTotal: industryProfiles.length,
      },
      scoring: {
        evaluatedTeams: teamScoreAgg.size,
        avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
        scoreCount,
        distribution,
        byStage: [...scoreByStage.entries()].map(([stageId, agg]) => {
          const stage = stages.find((s) => s.id === stageId);
          return { stageId, stageName: stage?.name ?? 'Unknown stage', avgScore: Math.round(agg.sum / agg.count), evaluated: agg.count };
        }),
        topTeams,
      },
      progress: {
        stages: stages.map((s) => {
          const stageMap = statusByStage.get(s.id) ?? new Map<string, number>();
          return {
            id: s.id,
            name: s.name,
            sequence: s.sequence,
            deadline: s.deadline.toISOString(),
            isActive: s.isActive,
            notStarted: stageMap.get('not_started') ?? 0,
            inProgress: stageMap.get('in_progress') ?? 0,
            submitted: stageMap.get('submitted') ?? 0,
            reviewed: (stageMap.get('reviewed') ?? 0) + (stageMap.get('qualified') ?? 0) + (stageMap.get('rejected') ?? 0),
            deliverables: deliverablesByStageMap.get(s.id) ?? 0,
          };
        }),
      },
      engagement: {
        teamsPerWeek: this.bucketWeeks(teamsCreatedAt.map((t) => t.createdAt)),
        submissionsPerWeek: this.bucketWeeks(deliverablesSubmittedAt.map((d) => d.submittedAt)),
      },
    };
  }

  private bucketWeeks(dates: Date[]) {
    if (dates.length === 0) return [];
    const sorted = dates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
    const start = new Date(sorted[0]);
    start.setHours(0, 0, 0, 0);
    const out = new Map<string, number>();
    for (const ts of sorted) {
      const day = new Date(ts);
      day.setHours(0, 0, 0, 0);
      const offset = Math.floor((day.getTime() - start.getTime()) / 86400000);
      const weekIndex = Math.floor(offset / 7);
      const label = new Date(start.getTime() + weekIndex * 604800000).toISOString().slice(0, 10);
      out.set(label, (out.get(label) ?? 0) + 1);
    }
    return [...out.entries()].map(([label, count]) => ({ label, count }));
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

  async listAudit(query: {
    page?: string;
    limit?: string;
    action?: string;
    entityType?: string;
    category?: string;
    search?: string;
    hours?: string;
  }) {
    const { page, limit, skip, take } = parsePagination(query);
    // An unrecognised category must match nothing. Falling through to `null` here
    // would spread no action filter at all and silently return every audit row.
    const actionFilter: Prisma.AuditLogWhereInput | null = query.category
      ? CATEGORY_ACTIONS[query.category]
        ? { action: { in: CATEGORY_ACTIONS[query.category] } }
        : { action: { in: [] } }
      : query.action
        ? { action: { contains: query.action } }
        : null;

    const where: Prisma.AuditLogWhereInput = {
      ...(actionFilter ?? {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.hours ? { createdAt: { gte: new Date(Date.now() - Number(query.hours) * 3_600_000) } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                actor: {
                  OR: [
                    { fullName: { contains: query.search, mode: 'insensitive' } },
                    { email: { contains: query.search, mode: 'insensitive' } },
                  ],
                },
              },
              { actorName: { contains: query.search, mode: 'insensitive' } },
              { actorEmail: { contains: query.search, mode: 'insensitive' } },
              { after: { path: [], string_contains: query.search } },
            ],
          }
        : {}),
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
    return { items: await enrichAuditRows(this.prisma, rows), total, page, limit, pages: Math.ceil(total / limit) };
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
    const password = generateStaffPassword();
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

  async removePreview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledTeams: {
          include: { members: { select: { userId: true, inviteStatus: true, joinedAt: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const teams = user.ledTeams.map((t) => {
      const successors = t.members
        .filter((m) => m.inviteStatus === InviteStatus.accepted && m.userId !== null && m.userId !== user.id)
        .sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0));
      return {
        teamId: t.id,
        name: t.name,
        memberCount: t.members.length,
        outcome: successors.length > 0 ? ('promote' as const) : ('delete' as const),
        nextLeaderId: successors[0]?.userId ?? null,
      };
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
      teams,
    };
  }

  async removeUser(actor: AuthUser, userId: string, confirm: string) {
    const startedAt = Date.now();
    const log = (event: string, extra: Record<string, unknown> = {}) =>
      console.log(`[ADMIN_REMOVE_USER] ${event}`, { ...extra, elapsedMs: Date.now() - startedAt });
    if (confirm !== 'CONFIRM') {
      throw new BadRequestException('Removal requires the confirmation code CONFIRM');
    }
    if (actor.id === userId) {
      throw new ForbiddenException('You cannot remove your own account');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledTeams: {
          include: { members: { select: { userId: true, inviteStatus: true, joinedAt: true } } },
        },
        industrialMentorProfile: { select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    log(`Started by ${actor.email} for user ${target.email}`, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      targetUserId: target.id,
      targetEmail: target.email,
      ledTeamCount: target.ledTeams.length,
    });
    if (target.platformRole === PlatformRole.admin) {
      const otherAdmins = await this.prisma.user.count({
        where: { platformRole: PlatformRole.admin, isActive: true, id: { not: userId } },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot remove the last active admin on the platform');
      }
    }

    const promotedTeams: Array<{ teamId: string; name: string; nextLeaderId: string; memberCount: number }> = [];
    const deletedTeams: Array<{ teamId: string; name: string; memberCount: number }> = [];
    const deletedTeamIds = new Set<string>();

    for (const t of target.ledTeams) {
      const successors = t.members
        .filter((m) => m.inviteStatus === InviteStatus.accepted && m.userId !== null && m.userId !== target.id)
        .sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0));
      if (successors.length > 0) {
        promotedTeams.push({
          teamId: t.id,
          name: t.name,
          nextLeaderId: successors[0].userId!,
          memberCount: t.members.length,
        });
        log(`Promoting successor for led team: ${t.id}`, {
          teamId: t.id,
          teamName: t.name,
          nextLeaderId: successors[0].userId,
          memberCount: t.members.length,
        });
      } else {
        deletedTeams.push({ teamId: t.id, name: t.name, memberCount: t.members.length });
        deletedTeamIds.add(t.id);
        log(`Deleting led team: ${t.id}`, {
          teamId: t.id,
          teamName: t.name,
          membersAffected: t.members.length,
        });
      }
    }
    if (target.ledTeams.length === 0) {
      log('Target led no teams', { targetUserId: target.id });
    }

    try {
      console.time(`user_removal_pipeline:${target.id}`);
      log('Transaction starting', {
        promotedTeamCount: promotedTeams.length,
        deletedTeamCount: deletedTeams.length,
      });
      await this.prisma.$transaction(async (tx) => {
        for (const p of promotedTeams) {
          await tx.team.update({ where: { id: p.teamId }, data: { leaderUserId: p.nextLeaderId } });
        }
        if (deletedTeamIds.size > 0) {
          await this.deleteTeams(tx, [...deletedTeamIds]);
        }

        if (target.industrialMentorProfile) {
          const profileId = target.industrialMentorProfile.id;
          await tx.team.updateMany({
            where: { industrialMentorId: profileId },
            data: { industrialMentorId: null },
          });
          await tx.mentorAssignment.updateMany({
            where: { industrialMentorId: profileId },
            data: { industrialMentorId: null },
          });
          await tx.industrialMentor.delete({ where: { id: profileId } });
        }

        await tx.team.updateMany({ where: { facultyMentorId: target.id }, data: { facultyMentorId: null } });

        const targetAssignments = await tx.mentorAssignment.findMany({
          where: { mentorUserId: target.id },
          select: { id: true, teamId: true },
        });
        const targetAssignmentIds = targetAssignments.map((a) => a.id);
        if (targetAssignmentIds.length > 0) {
          await tx.mentorAssignment.updateMany({
            where: { reassignedFromId: { in: targetAssignmentIds } },
            data: { reassignedFromId: null },
          });
          await tx.mentorAssignment.deleteMany({ where: { id: { in: targetAssignmentIds } } });
        }
        for (const teamId of [...new Set(targetAssignments.map((a) => a.teamId))]) {
          if (!deletedTeamIds.has(teamId)) await syncTeamMentorPointers(tx, teamId);
        }
        await tx.mentorAssignment.updateMany({
          where: { assignedById: target.id },
          data: { assignedById: actor.id },
        });
        await tx.mentorInvite.deleteMany({ where: { mentorUserId: target.id } });
        await tx.mentorInvite.deleteMany({ where: { invitedById: target.id } });

        await tx.ideaSubmission.updateMany({ where: { authorUserId: target.id }, data: { authorUserId: null } });
        await tx.teamPsPreference.updateMany({ where: { decidedById: target.id }, data: { decidedById: null } });
        await tx.teamPsPreference.deleteMany({ where: { submittedById: target.id } });
        await tx.notificationLog.updateMany({ where: { recipientUserId: target.id }, data: { recipientUserId: null } });
        await tx.stageResult.updateMany({ where: { publishedById: target.id }, data: { publishedById: null } });
        await tx.teamMember.deleteMany({ where: { userId: target.id } });
        await tx.joinRequest.deleteMany({ where: { studentId: target.id } });
        await tx.notification.deleteMany({ where: { userId: target.id } });

        // Other evaluators' rows can point at the target's via the supersede chain.
        const targetEvals = await tx.evaluation.findMany({
          where: { evaluatorUserId: target.id },
          select: { id: true },
        });
        if (targetEvals.length > 0) {
          const ids = targetEvals.map((e) => e.id);
          await tx.evaluation.updateMany({ where: { supersededById: { in: ids } }, data: { supersededById: null } });
          await tx.evaluation.deleteMany({ where: { id: { in: ids } } });
        }
        await tx.broadcast.deleteMany({ where: { adminUserId: target.id } });

        const commentIds = await tx.comment.findMany({
          where: { authorUserId: target.id },
          select: { id: true },
        });
        if (commentIds.length > 0) {
          const ids = commentIds.map((c) => c.id);
          await tx.comment.updateMany({ where: { parentCommentId: { in: ids } }, data: { parentCommentId: null } });
          await tx.comment.deleteMany({ where: { id: { in: ids } } });
        }

        await tx.auditLog.updateMany({ where: { actorUserId: target.id }, data: { actorUserId: null } });
        await tx.user.delete({ where: { id: target.id } });

        const membersAffected = deletedTeams.reduce((sum, d) => sum + d.memberCount, 0);
        await writeAudit(tx, {
          actorUserId: actor.id,
          action: 'user.remove',
          entityType: 'user',
          entityId: target.id,
          before: {
            id: target.id,
            email: target.email,
            fullName: target.fullName,
            platformRole: target.platformRole,
            wasTeamLeader: target.ledTeams.length > 0,
            ledTeamCount: target.ledTeams.length,
          },
          after: {
            removed: true,
            // Duplicated into `after` on purpose: the admin log search only scans
            // `after` (see listAudit), so the target email has to live there to be
            // findable once the user row is gone.
            targetEmail: target.email,
            wasTeamLeader: target.ledTeams.length > 0,
            ledTeamCount: target.ledTeams.length,
            impact: {
              promotedTeams: promotedTeams.map((p) => ({
                teamId: p.teamId,
                teamName: p.name,
                newLeaderUserId: p.nextLeaderId,
                memberCount: p.memberCount,
              })),
              deletedTeams: deletedTeams.map((d) => ({
                deletedTeamId: d.teamId,
                teamName: d.name,
                membersAffected: d.memberCount,
              })),
              membersAffected,
            },
            // Retained flat so pre-impact rows and existing readers keep working.
            promotedTeams: promotedTeams.map((p) => p.name),
            deletedTeams: deletedTeams.map((d) => d.name),
            auditLogsRetained: true,
          },
        });
        log('Audit row written inside transaction', { entityId: target.id, membersAffected });
      }, { timeout: 60_000, maxWait: 10_000 });
      console.timeEnd(`user_removal_pipeline:${target.id}`);
      log('Transaction committed', {
        promotedTeamCount: promotedTeams.length,
        deletedTeamCount: deletedTeams.length,
      });
    } catch (err: any) {
      console.timeEnd(`user_removal_pipeline:${target.id}`);
      console.error(
        `[ADMIN_REMOVE_USER_ERROR] failed userId=${target.id} email=${target.email} code=${err?.code ?? '-'}`,
        {
          actorUserId: actor.id,
          actorEmail: actor.email,
          targetUserId: target.id,
          targetEmail: target.email,
          promotedTeamCount: promotedTeams.length,
          deletedTeamCount: deletedTeams.length,
          elapsedMs: Date.now() - startedAt,
        },
        err?.meta ?? '',
        err?.stack ?? err,
      );
      throw err;
    }

    const clerk = getClerkClient();
    if (clerk && target.clerkUserId && !target.clerkUserId.startsWith('local:')) {
      try {
        await clerk.users.deleteUser(target.clerkUserId);
        log('Clerk user deleted', { clerkUserId: target.clerkUserId });
      } catch (err) {
        console.warn(`[ADMIN_REMOVE_USER] Clerk delete failed for ${target.email}:`, err);
      }
    }

    log('Completed', {
      targetUserId: target.id,
      targetEmail: target.email,
      promotedTeamCount: promotedTeams.length,
      deletedTeamCount: deletedTeams.length,
      membersAffected: deletedTeams.reduce((sum, d) => sum + d.memberCount, 0),
      totalMs: Date.now() - startedAt,
    });

    return {
      removed: true,
      email: target.email,
      fullName: target.fullName,
      promotedTeams: promotedTeams.length,
      deletedTeams: deletedTeams.length,
    };
  }

  private async deleteTeams(
    tx: Prisma.TransactionClient,
    teamIds: string[],
  ) {
    const assignments = await tx.mentorAssignment.findMany({
      where: { teamId: { in: teamIds } },
      select: { id: true },
    });
    const assignmentIds = assignments.map((a) => a.id);
    if (assignmentIds.length > 0) {
      await tx.mentorAssignment.updateMany({
        where: { reassignedFromId: { in: assignmentIds } },
        data: { reassignedFromId: null },
      });
    }
    const psRows = await tx.team.findMany({
      where: { id: { in: teamIds }, psId: { not: null } },
      select: { psId: true },
    });
    await tx.comment.updateMany({
      where: { teamId: { in: teamIds }, parentCommentId: { not: null } },
      data: { parentCommentId: null },
    });
    await tx.comment.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.deliverable.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.evaluation.updateMany({
      where: { supersededBy: { teamId: { in: teamIds } } },
      data: { supersededById: null },
    });
    await tx.evaluation.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.ideaSubmission.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.joinRequest.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.mentorAssignment.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.mentorInvite.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.stageResult.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.teamMember.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.teamPsPreference.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.teamStageStatus.deleteMany({ where: { teamId: { in: teamIds } } });
    await tx.team.deleteMany({ where: { id: { in: teamIds } } });
    // Group by psId and decrement once per distinct statement. Two deleted teams
    // can share a psId, so the per-team multiplicity has to be preserved —
    // de-duplicating to a Set here would silently under-count teamsSelectedCount.
    const decrements = new Map<string, number>();
    for (const row of psRows) {
      if (!row.psId) continue;
      decrements.set(row.psId, (decrements.get(row.psId) ?? 0) + 1);
    }
    for (const [psId, count] of decrements) {
      await tx.problemStatement.updateMany({
        where: { id: psId },
        data: { teamsSelectedCount: { decrement: count } },
      });
    }
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
      PlatformRole.student_expert,
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
          const password = needsCredentials ? generateStaffPassword() : undefined;
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
