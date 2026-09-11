import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MentorType } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { pickLeastLoadedMentor } from '../../domain/rules';
import { writeAudit } from '../../lib/audit';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { getSettingNumber } from '../../lib/settings';
import { MentorsRepository } from './repository';
import { allocateSchema } from './schema';

@Injectable()
export class MentorsService {
  constructor(
    private readonly repo: MentorsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async allocate(admin: AuthUser, body: z.infer<typeof allocateSchema>) {
    const existing = await this.repo.activeForTeam(body.teamId, body.mentorType as MentorType);
    if (existing) {
      throw new BadRequestException('Team already has an active mentor of this type; use reassign');
    }
    const capKey = body.mentorType === 'institute' ? 'institute_mentor_cap' : 'industry_mentor_cap';
    const cap = await getSettingNumber(this.prisma, capKey);
    const activeOfType = await this.prisma.mentorAssignment.count({
      where: { teamId: body.teamId, mentorType: body.mentorType, active: true },
    });
    if (activeOfType >= cap) {
      throw new BadRequestException(`Team already has ${cap} ${body.mentorType} mentor(s)`);
    }
    const assignment = await this.repo.create({
      team: { connect: { id: body.teamId } },
      mentor: { connect: { id: body.mentorUserId } },
      assignedBy: { connect: { id: admin.id } },
      mentorType: body.mentorType,
      assignmentMethod: body.assignmentMethod,
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.allocate',
      entityType: 'mentor_assignment',
      entityId: assignment.id,
      after: assignment as never,
    });
    await notifyUsers(this.prisma, [assignment.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'New team allocated',
      body: `You have been allocated as mentor to ${assignment.team.name}.`,
      relatedEntity: `team:${assignment.teamId}`,
    });
    return assignment;
  }

  async autoAllocate(admin: AuthUser, mentorType: MentorType) {
    const teams = await this.repo.unassignedTeams(mentorType);
    const mentors = await this.repo.mentorsByType(mentorType);
    if (!mentors.length) throw new BadRequestException('No mentors available for auto-allocation');
    const load = await this.repo.loadByMentor(mentors.map((m) => m.id));
    const results = [];
    for (const team of teams) {
      const mentor = pickLeastLoadedMentor(mentors, load, team.theme);
      if (!mentor) continue;
      const assignment = await this.allocate(admin, {
        teamId: team.id,
        mentorUserId: mentor.id,
        mentorType,
        assignmentMethod: 'auto_rule',
      });
      results.push(assignment);
      load.set(mentor.id, (load.get(mentor.id) ?? 0) + 1);
    }
    return { allocated: results.length, results };
  }

  async reassign(admin: AuthUser, assignmentId: string, mentorUserId: string) {
    const current = await this.repo.findById(assignmentId);
    if (!current) throw new NotFoundException('Assignment not found');
    await this.repo.deactivate(assignmentId);
    const next = await this.repo.create({
      team: { connect: { id: current.teamId } },
      mentor: { connect: { id: mentorUserId } },
      assignedBy: { connect: { id: admin.id } },
      mentorType: current.mentorType,
      assignmentMethod: 'manual',
      reassignedFrom: { connect: { id: assignmentId } },
    });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'mentor.reassign',
      entityType: 'mentor_assignment',
      entityId: next.id,
      before: { assignmentId, mentorUserId: current.mentorUserId },
      after: { assignmentId: next.id, mentorUserId },
    });
    await notifyUsers(this.prisma, [next.mentor.id], {
      type: 'allocation',
      template: 'mentor_allocation',
      title: 'Team reassigned to you',
      body: `You have been allocated as mentor to ${next.team.name}.`,
      relatedEntity: `team:${next.teamId}`,
    });
    return next;
  }

  myTeams(user: AuthUser) {
    return this.repo.teamsForMentor(user.id);
  }
}
