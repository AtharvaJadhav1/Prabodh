import { Injectable } from '@nestjs/common';
import { InviteStatus, Prisma, PsPreferenceStatus, TeamStatus } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get prismaClient() {
    return this.prisma;
  }

  create(data: Prisma.TeamCreateInput) {
    return this.prisma.team.create({ data, include: { members: true, leader: true } });
  }

  /** Lightweight lookup for auth checks and mutations — avoids loading the full workspace graph. */
  /** True when the user ever held a mentor seat (active or not) on the team. */
  async hasMentorHistory(teamId: string, userId: string) {
    const row = await this.prisma.mentorAssignment.findFirst({
      where: { teamId, mentorUserId: userId },
      select: { id: true },
    });
    return !!row;
  }

  findForAccessCheck(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        leaderUserId: true,
        name: true,
        teamCode: true,
        status: true,
        detailsLockAt: true,
        members: { select: { userId: true } },
        mentorAssignments: { where: { active: true }, select: { mentorUserId: true } },
      },
    });
  }

  private readonly psSelect = {
    id: true,
    code: true,
    title: true,
    theme: true,
    category: true,
    organisation: true,
    description: true,
  };

  private readonly dashboardInclude = {
    members: {
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
            institute: true,
            profileJson: true,
          },
        },
      },
    },
    leader: {
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        institute: true,
      },
    },
    problemStatement: { select: this.psSelect },
    mentorInvites: {
      where: { inviteStatus: InviteStatus.pending },
      include: {
        mentor: { select: { id: true, fullName: true, email: true, linkedinUrl: true } },
      },
    },
    mentorAssignments: {
      where: { active: true },
      include: {
        mentor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            platformRole: true,
            phone: true,
            institute: true,
            department: true,
            domainTags: true,
            // Public LinkedIn link — rendered as a clickable icon beside the name.
            linkedinUrl: true,
          },
        },
        industrialMentor: true,
      },
    },
    ideaSubmissions: {
      orderBy: { version: 'desc' as const },
      take: 1,
      select: {
        id: true,
        status: true,
        abstract: true,
        techStack: true,
        feasibilityNotes: true,
        version: true,
        problemStatement: { select: this.psSelect },
      },
    },
  };

  /** Fast path for student dashboard — skips comments, evaluations, deliverables, and stage aggregates. */
  findByIdDashboard(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: this.dashboardInclude,
    });
  }

  findCurrentForUser(userId: string) {
    return this.prisma.team.findFirst({
      where: {
        status: { not: 'disqualified' },
        OR: [{ leaderUserId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
      include: this.dashboardInclude,
    });
  }

  private readonly authorSelect = {
    id: true,
    fullName: true,
    email: true,
    platformRole: true,
  } as const;

  findById(id: string, opts: { psPreferenceStatuses?: PsPreferenceStatus[] } = {}) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        ...this.dashboardInclude,
        psPreferences: {
          where: opts.psPreferenceStatuses ? { status: { in: opts.psPreferenceStatuses } } : undefined,
          orderBy: { rank: 'asc' as const },
          include: { problemStatement: { select: this.psSelect } },
        },
        deliverables: { orderBy: { submittedAt: 'desc' }, take: 12 },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: this.authorSelect } },
          take: 50,
        },
        evaluations: {
          where: { supersededById: null },
          include: {
            rubric: true,
            stage: { select: { id: true, name: true, sequence: true, isActive: true } },
            evaluator: { select: this.authorSelect },
          },
          take: 80,
        },
      },
    });
  }

  listDeliverables(teamId: string) {
    return this.prisma.deliverable.findMany({
      where: { teamId },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    });
  }

  private readonly listLeaderSelect = {
    id: true,
    fullName: true,
    email: true,
    department: true,
    institute: true,
  } as const;

  private readonly listMemberSelect = {
    id: true,
    userId: true,
    invitedEmail: true,
    inviteStatus: true,
    joinedAt: true,
    user: {
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        institute: true,
        profileJson: true,
      },
    },
  } as const;

  listMine(userId: string) {
    return this.prisma.team.findMany({
      where: {
        status: { not: 'disqualified' },
        OR: [{ leaderUserId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
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
        leader: { select: this.listLeaderSelect },
        problemStatement: { select: this.psSelect },
        members: { select: this.listMemberSelect },
      },
    });
  }

  list(skip: number, take: number) {
    return this.prisma.team.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
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
        leader: { select: this.listLeaderSelect },
        problemStatement: { select: this.psSelect },
      },
    });
  }

  count() {
    return this.prisma.team.count();
  }

  update(id: string, data: Prisma.TeamUpdateInput) {
    return this.prisma.team.update({ where: { id }, data });
  }

  addMember(data: Prisma.TeamMemberCreateInput) {
    return this.prisma.teamMember.create({ data });
  }

  findMemberByEmail(teamId: string, email: string) {
    return this.prisma.teamMember.findUnique({
      where: { teamId_invitedEmail: { teamId, invitedEmail: email } },
    });
  }

  lock(id: string) {
    return this.prisma.team.update({
      where: { id },
      data: { status: TeamStatus.locked, detailsLockAt: new Date() },
    });
  }
}

export async function generateTeamCode(prisma: PrismaService): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const rows = await prisma.team.findMany({
      where: { teamCode: { startsWith: 'INC-' } },
      select: { teamCode: true },
    });
    const maxNum = rows.reduce((m, r) => {
      const n = Number(r.teamCode.slice(4));
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const code = `INC-${String(maxNum + 1).padStart(4, '0')}`;
    const exists = await prisma.team.findUnique({ where: { teamCode: code } });
    if (!exists) return code;
  }
  return `INC-${Date.now().toString().slice(-4)}`;
}
