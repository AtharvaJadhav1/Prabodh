import { Injectable } from '@nestjs/common';
import { InviteStatus, Prisma, TeamStatus } from '@prisma/client';
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

  findById(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
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
            profileJson: true,
          },
        },
        problemStatement: true,
        mentorInvites: { include: { mentor: true } },
        mentorAssignments: { where: { active: true }, include: { mentor: true } },
        ideaSubmissions: { orderBy: { version: 'desc' }, take: 3, include: { problemStatement: true } },
        psPreferences: { orderBy: { rank: 'asc' }, include: { problemStatement: true } },
        deliverables: { orderBy: { submittedAt: 'desc' }, take: 12 },
        stageStatuses: { include: { stage: true } },
        comments: { orderBy: { createdAt: 'asc' }, include: { author: true }, take: 50 },
        evaluations: {
          where: { supersededById: null },
          include: { rubric: true, stage: true, evaluator: true },
          take: 80,
        },
        stageResults: { include: { stage: true } },
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.team.findMany({
      where: {
        OR: [{ leaderUserId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
      include: { leader: true, problemStatement: true, members: true },
    });
  }

  list(skip: number, take: number) {
    return this.prisma.team.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { leader: true, problemStatement: true },
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

  countActiveMembers(teamId: string) {
    return this.prisma.teamMember.count({
      where: { teamId, inviteStatus: { in: [InviteStatus.pending, InviteStatus.accepted] } },
    });
  }

  findMemberByEmail(teamId: string, email: string) {
    return this.prisma.teamMember.findUnique({
      where: { teamId_invitedEmail: { teamId, invitedEmail: email } },
    });
  }

  acceptInvite(clerkInvitationId: string, userId: string) {
    return this.prisma.teamMember.updateMany({
      where: { clerkInvitationId },
      data: { inviteStatus: InviteStatus.accepted, userId, joinedAt: new Date() },
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
    const code = `SIH-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const exists = await prisma.team.findUnique({ where: { teamCode: code } });
    if (!exists) return code;
  }
  return `SIH-${Date.now().toString().slice(-4)}`;
}
