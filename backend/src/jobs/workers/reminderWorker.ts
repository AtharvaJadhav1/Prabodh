import { InviteStatus, PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS } from '../../domain/rules';
import { notifyUsers } from '../../lib/notify';
import { PrismaService } from '../../lib/prisma.service';

const prisma = new PrismaClient() as unknown as PrismaService;

export async function handleReminderTick() {
  const now = Date.now();
  const offsets = [
    { ms: 48 * 3600 * 1000, label: '48 hours' },
    { ms: 4 * 3600 * 1000, label: '4 hours' },
  ];
  const stages = await prisma.stage.findMany({ where: { isActive: true } });
  for (const stage of stages) {
    const until = stage.deadline.getTime() - now;
    const hit = offsets.find((o) => until > 0 && until <= o.ms && until > o.ms - 15 * 60 * 1000);
    if (!hit) continue;
    const members = await prisma.teamMember.findMany({
      where: { inviteStatus: 'accepted', userId: { not: null } },
    });
    await notifyUsers(
      prisma,
      members.map((m) => m.userId).filter((id): id is string => Boolean(id)),
      {
        type: 'deadline',
        template: 'deadline_reminder',
        title: `Deadline in ${hit.label}: ${stage.name}`,
        body: `${stage.name} closes at ${stage.deadline.toISOString()}`,
        relatedEntity: `stage:${stage.id}`,
      },
    );
  }

  const expired = await prisma.stage.findMany({ where: { deadline: { lte: new Date() } } });
  for (const stage of expired) {
    await prisma.deliverable.updateMany({ where: { stageId: stage.id, locked: false }, data: { locked: true } });
  }

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
