import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextMentorLockedAt } from './mentor-rules';

/**
 * Keep the denormalized mentor pointers on `teams` in sync with the source of
 * truth (active rows in `mentor_assignments`). Every mentor mutation must call
 * this inside the same transaction.
 *
 * `mentorLockedAt` follows the faculty seat: set when an active institute assignment exists,
 * cleared when none remains (unassign / reassign-away / deactivate), so a team is never left
 * "locked" with no faculty mentor.
 */
export async function syncTeamMentorPointers(
  db: Pick<Prisma.TransactionClient, 'mentorAssignment' | 'team'>,
  teamId: string,
) {
  const active = await db.mentorAssignment.findMany({
    where: { teamId, active: true },
    select: { mentorType: true, mentorUserId: true, industrialMentorId: true },
  });
  const faculty = active.find((a) => a.mentorType === 'institute');
  const industry = active.find((a) => a.mentorType === 'industry');
  const current = await db.team.findUnique({ where: { id: teamId }, select: { mentorLockedAt: true } });
  await db.team.update({
    where: { id: teamId },
    data: {
      facultyMentorId: faculty?.mentorUserId ?? null,
      industrialMentorId: industry?.industrialMentorId ?? null,
      mentorLockedAt: nextMentorLockedAt(Boolean(faculty), current?.mentorLockedAt ?? null, new Date()),
    },
  });
}

/** Row-lock the team so concurrent seat changes on it serialize. Must run inside a transaction. */
export async function lockTeamRow(tx: Pick<Prisma.TransactionClient, '$queryRaw'>, teamId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "teams" WHERE id = ${teamId} FOR UPDATE`;
  if (!rows.length) throw new NotFoundException('Team not found');
}

/** Industry seats must reference an active IndustrialMentor profile; fail loudly instead of seating with a null pointer. */
export async function requireIndustrialProfileId(
  db: Pick<Prisma.TransactionClient, 'industrialMentor'>,
  userId: string,
): Promise<string> {
  const profile = await db.industrialMentor.findUnique({ where: { userId }, select: { id: true, isActive: true } });
  if (!profile || !profile.isActive) {
    throw new BadRequestException(
      'That person has no active industrial mentor profile. Ask your nodal admin to onboard them first.',
    );
  }
  return profile.id;
}
