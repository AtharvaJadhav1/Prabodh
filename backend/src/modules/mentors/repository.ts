import { Injectable } from '@nestjs/common';
import { MentorType, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class MentorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.MentorAssignmentCreateInput) {
    return this.prisma.mentorAssignment.create({ data, include: { mentor: true, team: true } });
  }

  findById(id: string) {
    return this.prisma.mentorAssignment.findUnique({
      where: { id },
      include: { mentor: true, team: true },
    });
  }

  deactivate(id: string) {
    return this.prisma.mentorAssignment.update({ where: { id }, data: { active: false } });
  }

  activeForTeam(teamId: string, mentorType: MentorType) {
    return this.prisma.mentorAssignment.findFirst({
      where: { teamId, mentorType, active: true },
    });
  }

  teamsForMentor(mentorUserId: string) {
    return this.prisma.mentorAssignment.findMany({
      where: { mentorUserId, active: true },
      include: {
        team: {
          include: {
            problemStatement: true,
            leader: true,
            members: { include: { user: true } },
            mentorAssignments: { where: { active: true }, include: { mentor: true } },
            psPreferences: { orderBy: { rank: 'asc' }, include: { problemStatement: true } },
            stageResults: { include: { stage: true } },
            ideaSubmissions: {
              orderBy: { version: 'desc' },
              take: 5,
              include: { problemStatement: true },
            },
            deliverables: { orderBy: { submittedAt: 'desc' }, take: 20, include: { stage: true } },
            stageStatuses: { include: { stage: true } },
          },
        },
      },
    });
  }

  unassignedTeams(mentorType: MentorType) {
    return this.prisma.team.findMany({
      where: {
        mentorAssignments: { none: { mentorType, active: true } },
        status: { not: 'disqualified' },
      },
    });
  }

  mentorsByType(mentorType: MentorType) {
    const role = mentorType === 'institute' ? 'institute_mentor' : 'industry_mentor';
    return this.prisma.user.findMany({
      where: { platformRole: role, isActive: true },
    });
  }

  async loadByMentor(mentorIds: string[]) {
    const grouped = await this.prisma.mentorAssignment.groupBy({
      by: ['mentorUserId'],
      where: { mentorUserId: { in: mentorIds }, active: true },
      _count: true,
    });
    return new Map(grouped.map((g) => [g.mentorUserId, g._count]));
  }
}
