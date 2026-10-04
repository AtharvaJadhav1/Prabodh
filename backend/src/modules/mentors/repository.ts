import { Injectable } from '@nestjs/common';
import { MentorType, Prisma, PsPreferenceStatus } from '@prisma/client';
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
          select: {
            id: true,
            name: true,
            teamCode: true,
            theme: true,
            institute: true,
            status: true,
            leader: { select: { id: true, fullName: true, email: true } },
            members: {
              where: { inviteStatus: 'accepted' },
              select: { id: true },
            },
            problemStatement: {
              select: {
                id: true,
                code: true,
                title: true,
                theme: true,
                category: true,
                organisation: true,
                description: true,
              },
            },
            psPreferences: {
              // Unsubmitted drafts stay private to the student until they submit for review.
              where: { status: { in: [PsPreferenceStatus.submitted, PsPreferenceStatus.approved] } },
              orderBy: { rank: 'asc' },
              include: {
                problemStatement: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    theme: true,
                    category: true,
                    organisation: true,
                    description: true,
                  },
                },
              },
            },
            stageResults: {
              select: { published: true, weightedScore: true, stage: { select: { name: true } } },
            },
            // Who else mentors this team (faculty + industry). The Industry Mentors page and the
            // industry workspace's "via institute mentor" column are built from this.
            mentorAssignments: {
              where: { active: true },
              select: {
                id: true,
                mentorType: true,
                mentorUserId: true,
                mentor: { select: { id: true, fullName: true, email: true, institute: true, department: true, phone: true } },
                industrialMentor: {
                  select: { id: true, companyName: true, designation: true, domainExpertise: true, phone: true },
                },
              },
            },
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
    // Dual-role accounts appear under both directories: match primary OR secondary.
    return this.prisma.user.findMany({
      where: {
        OR: [{ platformRole: role }, { additionalRoles: { has: role } }],
        isActive: true,
      },
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
