import { Injectable } from '@nestjs/common';
import { PsPreferenceStatus } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class PsPreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForTeam(teamId: string) {
    return this.prisma.teamPsPreference.findMany({
      where: { teamId },
      orderBy: { rank: 'asc' },
      include: { problemStatement: true },
    });
  }

  findOne(id: string) {
    return this.prisma.teamPsPreference.findUnique({
      where: { id },
      include: { problemStatement: true },
    });
  }

  hasApprovedOrLocked(teamId: string) {
    return this.prisma.teamPsPreference.findFirst({ where: { teamId, status: PsPreferenceStatus.approved } });
  }

  async replaceAll(
    teamId: string,
    submittedById: string,
    entries: Array<
      | { rank: number; psId: string }
      | { rank: number; title: string; theme: string; category: 'software' | 'hardware'; organisation: string; description: string }
    >,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "teams" WHERE id = ${teamId} FOR UPDATE`;
      await tx.teamPsPreference.deleteMany({ where: { teamId, status: PsPreferenceStatus.submitted } });
      await tx.teamPsPreference.createMany({
        data: entries.map((entry) => ({
          teamId,
          rank: entry.rank,
          submittedById,
          status: PsPreferenceStatus.submitted,
          ...('psId' in entry
            ? { psId: entry.psId }
            : {
                title: entry.title,
                theme: entry.theme,
                category: entry.category,
                organisation: entry.organisation,
                description: entry.description,
              }),
        })),
      });
      return tx.teamPsPreference.findMany({
        where: { teamId },
        orderBy: { rank: 'asc' },
        include: { problemStatement: true },
      });
    });
  }
}
