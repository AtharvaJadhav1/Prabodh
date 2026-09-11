import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IdeaStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { PrismaService } from '../../lib/prisma.service';
import { getSettingNumber } from '../../lib/settings';
import { TeamsService } from '../teams/service';
import { ProblemStatementsRepository } from './repository';
import { createIdeaSchema, createPsSchema, manualIdeaSchema, patchIdeaSchema, patchPsSchema } from './schema';

@Injectable()
export class ProblemStatementsService {
  constructor(
    private readonly repo: ProblemStatementsRepository,
    private readonly teams: TeamsService,
    private readonly prisma: PrismaService,
  ) {}

  async list(query: { theme?: string; category?: string; organisation?: string; q?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const [items, total] = await this.repo.list(query, (page - 1) * limit, limit);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  createPs(body: z.infer<typeof createPsSchema>) {
    return this.repo.createPs(body);
  }

  async updatePs(id: string, body: z.infer<typeof patchPsSchema>) {
    const existing = await this.repo.findPs(id);
    if (!existing) throw new NotFoundException('Problem statement not found');
    return this.prisma.problemStatement.update({ where: { id }, data: body });
  }

  async deletePs(id: string) {
    const existing = await this.repo.findPs(id);
    if (!existing) throw new NotFoundException('Problem statement not found');
    const inUse = await this.prisma.ideaSubmission.count({
      where: { psId: id, status: { not: 'abandoned' } },
    });
    if (inUse) throw new ConflictException('Cannot delete a PS that still has submissions');
    return this.prisma.problemStatement.delete({ where: { id } });
  }

  async createIdea(user: AuthUser, body: z.infer<typeof createIdeaSchema>) {
    const team = await this.teams.assertTeamAccess(user, body.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can submit an idea');
    }
    const existing = await this.repo.findLatestIdeaForTeam(body.teamId);
    if (existing?.status === IdeaStatus.locked) {
      throw new ForbiddenException('Idea already locked');
    }
    if (existing) {
      throw new ConflictException('Draft already exists; PATCH the existing submission');
    }
    const result = await this.repo.createDraftWithCap({ ...body, authorUserId: user.id });
    if ('error' in result && result.error === 'ps_not_found') throw new NotFoundException('Problem statement not found');
    if ('error' in result && result.error === 'ps_full') {
      throw new ConflictException('PS full: team cap reached for this problem statement');
    }
    return result.idea;
  }

  async patchIdea(user: AuthUser, id: string, body: z.infer<typeof patchIdeaSchema>) {
    const idea = await this.repo.findIdea(id);
    if (!idea) throw new NotFoundException('Idea not found');
    if (idea.status === IdeaStatus.locked) throw new ForbiddenException('Locked submissions cannot be edited');
    const team = await this.teams.assertTeamAccess(user, idea.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can update the idea');
    }
    const result = await this.repo.updateDraft(
      id,
      {
        abstract: body.abstract,
        techStack: body.techStack,
        feasibilityNotes: body.feasibilityNotes,
        ...(body.psId ? { problemStatement: { connect: { id: body.psId } } } : {}),
      },
      idea.psId,
      body.psId,
    );
    if ('error' in result && result.error === 'ps_full') {
      throw new ConflictException('PS full: team cap reached for this problem statement');
    }
    if ('error' in result && result.error === 'ps_not_found') throw new NotFoundException('Problem statement not found');
    return result.idea;
  }

  async lockIdea(user: AuthUser, id: string) {
    const idea = await this.repo.findIdea(id);
    if (!idea) throw new NotFoundException('Idea not found');
    const team = await this.teams.assertTeamAccess(user, idea.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can lock the idea');
    }
    if (idea.status === IdeaStatus.locked) return idea;
    return this.repo.lockIdea(id, idea.teamId, idea.psId);
  }

  async abandonIdea(user: AuthUser, id: string) {
    const idea = await this.repo.findIdea(id);
    if (!idea) throw new NotFoundException('Idea not found');
    const team = await this.teams.assertTeamAccess(user, idea.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can abandon a draft');
    }
    const res = await this.repo.abandonDraft(id);
    if ('error' in res) throw new ForbiddenException('Only unlocked drafts can be abandoned');
    return { abandoned: true };
  }

  async releaseStaleDrafts() {
    const hours = await getSettingNumber(this.prisma, 'draft_hold_hours');
    return this.repo.releaseStaleDrafts(hours);
  }

  async submitManualIdea(user: AuthUser, body: z.infer<typeof manualIdeaSchema>) {
    const team = await this.teams.assertTeamAccess(user, body.teamId);
    if (!this.teams.isLeader(user, team)) {
      throw new ForbiddenException('Only the team leader can submit a manual problem statement');
    }
    const existing = await this.repo.findLatestIdeaForTeam(body.teamId);
    if (existing?.status === IdeaStatus.locked) {
      throw new ForbiddenException('Problem statement already locked for this team');
    }
    const code = `STU-${team.teamCode}-${Date.now().toString(36).toUpperCase()}`;
    const ps = await this.repo.createPs({
      code,
      title: body.title,
      theme: body.theme,
      category: body.category,
      organisation: body.organisation,
      description: body.description,
      teamCap: 1,
    });
    if (existing) {
      await this.prisma.ideaSubmission.delete({ where: { id: existing.id } });
    }
    const draft = await this.repo.createDraftWithCap({
      teamId: body.teamId,
      psId: ps.id,
      abstract: body.abstract,
      techStack: body.techStack,
      feasibilityNotes: body.feasibilityNotes,
      authorUserId: user.id,
    });
    if ('error' in draft) throw new ConflictException('Could not create manual submission');
    return this.repo.lockIdea(draft.idea.id, body.teamId, ps.id);
  }
}
