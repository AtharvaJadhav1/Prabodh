import { InviteStatus, PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS } from '../../domain/rules';
import { PrismaService } from '../../lib/prisma.service';

const prisma = new PrismaClient() as unknown as PrismaService;

export async function handleReminderTick() {
  const inviteHours = Number(
    (await prisma.platformSetting.findUnique({ where: { key: 'invite_ttl_hours' } }))?.value ??
      DEFAULT_SETTINGS.invite_ttl_hours,
  );
  await prisma.teamMember.updateMany({
    where: {
      inviteStatus: InviteStatus.pending,
      createdAt: { lte: new Date(Date.now() - inviteHours * 3600 * 1000) },
    },
    data: { inviteStatus: InviteStatus.expired },
  });

  const draftHours = Number(
    (await prisma.platformSetting.findUnique({ where: { key: 'draft_hold_hours' } }))?.value ??
      DEFAULT_SETTINGS.draft_hold_hours,
  );
  const stale = await prisma.ideaSubmission.findMany({
    where: { status: 'draft', updatedAt: { lte: new Date(Date.now() - draftHours * 3600 * 1000) } },
  });
  for (const idea of stale) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.ideaSubmission.findUnique({ where: { id: idea.id } });
      if (!current || current.status !== 'draft') return;
      await tx.ideaSubmission.update({ where: { id: idea.id }, data: { status: 'abandoned' } });
      await tx.problemStatement.update({
        where: { id: current.psId },
        data: { teamsSelectedCount: { decrement: 1 } },
      });
    });
  }
}
