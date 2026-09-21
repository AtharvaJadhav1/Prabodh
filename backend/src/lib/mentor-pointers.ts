import { Prisma } from '@prisma/client';

/**
 * Keep the denormalized mentor pointers on `teams` in sync with the source of
 * truth (active rows in `mentor_assignments`). Every mentor mutation must call
 * this inside the same transaction.
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
  await db.team.update({
    where: { id: teamId },
    data: {
      facultyMentorId: faculty?.mentorUserId ?? null,
      industrialMentorId: industry?.industrialMentorId ?? null,
    },
  });
}