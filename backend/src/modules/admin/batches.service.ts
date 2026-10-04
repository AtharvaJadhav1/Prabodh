import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { writeAudit } from '../../lib/audit';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';
import { isTeamFrozen } from '../../lib/team-rules';

export const batchCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  teamIds: z.array(z.string().uuid()).max(500).default([]),
});

export const batchUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const batchTeamsSchema = z.object({
  teamIds: z.array(z.string().uuid()).min(1).max(500),
});

export const batchLeadersSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(500),
  /** Also email + notify each leader whose team was added. */
  notify: z.boolean().default(true),
});

export const batchResolveSchema = z.object({
  emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(500),
});

export type LeaderInviteStatus =
  | 'added'
  | 'already_in_batch'
  | 'in_other_batch'
  | 'no_account'
  | 'not_a_leader';

export type LeaderInviteResult = {
  email: string;
  status: LeaderInviteStatus;
  teams: Array<{ id: string; name: string; teamCode: string }>;
  /** For in_other_batch: where the team currently is. */
  otherBatch?: string;
};

const TEAM_SUMMARY = {
  id: true,
  teamCode: true,
  name: true,
  theme: true,
  institute: true,
  status: true,
  _count: { select: { members: true } },
} as const;

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { teams: true } },
      },
    });
    return rows.map(({ _count, ...b }) => ({ ...b, teamCount: _count.teams }));
  }

  async get(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        teams: { select: TEAM_SUMMARY, orderBy: { teamCode: 'asc' } },
      },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async create(admin: AuthUser, body: z.infer<typeof batchCreateSchema>) {
    const teamIds = [...new Set(body.teamIds)];
    try {
      const batch = await this.prisma.$transaction(async (tx) => {
        const created = await tx.batch.create({
          data: { name: body.name, description: body.description || null, createdById: admin.id },
        });
        if (teamIds.length) await this.assignTeams(tx, created.id, teamIds);
        return created;
      });
      await writeAudit(this.prisma, {
        actorUserId: admin.id,
        action: 'batch.create',
        entityType: 'batch',
        entityId: batch.id,
        after: { name: batch.name, teamCount: teamIds.length },
      });
      return this.get(batch.id);
    } catch (err) {
      throw this.translate(err);
    }
  }

  async update(admin: AuthUser, id: string, body: z.infer<typeof batchUpdateSchema>) {
    await this.get(id);
    try {
      await this.prisma.batch.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
        },
      });
    } catch (err) {
      throw this.translate(err);
    }
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'batch.update',
      entityType: 'batch',
      entityId: id,
      after: { name: body.name ?? null },
    });
    return this.get(id);
  }

  async addTeams(admin: AuthUser, id: string, teamIds: string[]) {
    await this.get(id);
    const unique = [...new Set(teamIds)];
    try {
      await this.prisma.$transaction((tx) => this.assignTeams(tx, id, unique));
    } catch (err) {
      throw this.translate(err);
    }
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'batch.add_teams',
      entityType: 'batch',
      entityId: id,
      after: { teamIds: unique },
    });
    return this.get(id);
  }

  /**
   * Bulk add: each email is a team leader; every team they lead that is not in a batch goes straight
   * into this batch. Teams already placed are reported, never moved.
   */
  async inviteLeaders(admin: AuthUser, id: string, body: z.infer<typeof batchLeadersSchema>) {
    const batch = await this.get(id);
    const emails = [...new Set(body.emails)];
    const { results, toAdd, leaderForTeam } = await this.classifyLeaders(emails, id);

    if (toAdd.length) {
      try {
        await this.prisma.$transaction((tx) => this.assignTeams(tx, id, toAdd));
      } catch (err) {
        throw this.translate(err);
      }
      await writeAudit(this.prisma, {
        actorUserId: admin.id,
        action: 'batch.add_teams',
        entityType: 'batch',
        entityId: id,
        after: { teamIds: toAdd, via: 'leader_emails' },
      });
      if (body.notify) {
        const leaderIds = [...new Set(leaderForTeam.values())];
        void notifyUsers(this.prisma, leaderIds, {
          type: 'allocation',
          template: 'admin_broadcast',
          title: `Your team was added to ${batch.name}`,
          body: `Your team has been added to the batch "${batch.name}" by the administrator. No action is needed from you.`,
          relatedEntity: `batch:${id}`,
        }).catch((err) => console.error('[batches] leader notification failed', err));
      }
    }

    return {
      batch: await this.get(id),
      results,
      summary: this.summarize(results, emails.length, toAdd.length),
    };
  }

  /**
   * Preview for the Create Batch form (no batch exists yet): resolve leader emails to teams that are
   * free to join. Nothing is saved and nobody is notified until the batch is created.
   */
  async resolveLeaders(emails: string[]) {
    const unique = [...new Set(emails)];
    const { results, toAdd } = await this.classifyLeaders(unique, null);
    const teams = toAdd.length
      ? await this.prisma.team.findMany({ where: { id: { in: toAdd } }, select: TEAM_SUMMARY, orderBy: { teamCode: 'asc' } })
      : [];
    return { results, teams, summary: this.summarize(results, unique.length, toAdd.length) };
  }

  private summarize(results: LeaderInviteResult[], requested: number, teamsAdded: number) {
    const count = (s: LeaderInviteStatus) => results.filter((r) => r.status === s).length;
    return {
      requested,
      added: count('added'),
      teamsAdded,
      alreadyInBatch: count('already_in_batch'),
      inOtherBatch: count('in_other_batch'),
      noAccount: count('no_account'),
      notALeader: count('not_a_leader'),
    };
  }

  /** Map each leader email to the teams it can add. `batchId` null = a batch that doesn't exist yet. */
  private async classifyLeaders(emails: string[], batchId: string | null) {
    const users = await this.prisma.user.findMany({
      where: { OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
      select: {
        id: true,
        email: true,
        ledTeams: {
          where: { status: { not: 'disqualified' } },
          select: { id: true, name: true, teamCode: true, batchId: true, batch: { select: { name: true } } },
        },
      },
    });
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const ref = (t: { id: string; name: string; teamCode: string }) => ({ id: t.id, name: t.name, teamCode: t.teamCode });

    const results: LeaderInviteResult[] = [];
    const toAdd: string[] = [];
    const leaderForTeam = new Map<string, string>();

    for (const email of emails) {
      const user = byEmail.get(email);
      if (!user) {
        results.push({ email, status: 'no_account', teams: [] });
        continue;
      }
      if (!user.ledTeams.length) {
        results.push({ email, status: 'not_a_leader', teams: [] });
        continue;
      }
      const free = user.ledTeams.filter((t) => !t.batchId);
      const here = batchId ? user.ledTeams.filter((t) => t.batchId === batchId) : [];
      const elsewhere = user.ledTeams.filter((t) => t.batchId && t.batchId !== batchId);
      if (free.length) {
        free.forEach((t) => {
          toAdd.push(t.id);
          leaderForTeam.set(t.id, user.id);
        });
        results.push({ email, status: 'added', teams: free.map(ref) });
      } else if (here.length) {
        results.push({ email, status: 'already_in_batch', teams: here.map(ref) });
      } else {
        results.push({
          email,
          status: 'in_other_batch',
          teams: elsewhere.map(ref),
          otherBatch: elsewhere[0]?.batch?.name,
        });
      }
    }
    return { results, toAdd, leaderForTeam };
  }

  async removeTeam(admin: AuthUser, id: string, teamId: string) {
    const result = await this.prisma.team.updateMany({
      where: { id: teamId, batchId: id },
      data: { batchId: null },
    });
    if (!result.count) throw new NotFoundException('That team is not in this batch');
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'batch.remove_team',
      entityType: 'batch',
      entityId: id,
      after: { teamId },
    });
    return this.get(id);
  }

  async remove(admin: AuthUser, id: string) {
    const batch = await this.get(id);
    // Teams keep existing — the FK sets their batch_id back to null.
    await this.prisma.batch.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actorUserId: admin.id,
      action: 'batch.delete',
      entityType: 'batch',
      entityId: id,
      before: { name: batch.name, teamCount: batch.teams.length },
    });
    return { ok: true };
  }

  /** Attach teams only if they exist and are not in any batch yet (one batch per team). */
  private async assignTeams(tx: Pick<PrismaService, 'team'>, batchId: string, teamIds: string[]) {
    const found = await tx.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, teamCode: true, batchId: true, status: true },
    });
    if (found.length !== teamIds.length) {
      throw new BadRequestException('One or more selected teams no longer exist.');
    }
    // A disqualified team is permanently frozen; its batch seat stays released.
    const frozen = found.filter((t) => isTeamFrozen(t.status));
    if (frozen.length) {
      throw new BadRequestException(
        `Disqualified teams cannot join a batch: ${frozen.map((t) => `${t.name} (${t.teamCode})`).join(', ')}`,
      );
    }
    const taken = found.filter((t) => t.batchId && t.batchId !== batchId);
    if (taken.length) {
      throw new ConflictException(
        `Already in another batch: ${taken.map((t) => `${t.name} (${t.teamCode})`).join(', ')}`,
      );
    }
    // Guard against a concurrent assignment between the read above and this write.
    const updated = await tx.team.updateMany({
      where: { id: { in: teamIds }, OR: [{ batchId: null }, { batchId }] },
      data: { batchId },
    });
    if (updated.count !== teamIds.length) {
      throw new ConflictException('Some teams were just added to another batch. Refresh and try again.');
    }
  }

  private translate(err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') return new ConflictException('A batch with this name already exists.');
    return err;
  }
}
