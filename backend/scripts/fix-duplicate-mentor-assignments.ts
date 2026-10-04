/**
 * One-time cleanup for teams that ended up with more than one ACTIVE mentor
 * assignment of the same mentorType (two different people both "institute",
 * or both "industry"). A single mentor legitimately holding both an institute
 * AND an industry seat on the same team is NOT a duplicate and is left alone.
 *
 * For each genuine duplicate group, the most recently assigned row
 * (assignedAt desc, createdAt as tiebreak) is kept active; the rest are
 * deactivated the same way MentorsService.reassign supersedes a seat.
 *
 * Usage:
 *   npx ts-node scripts/fix-duplicate-mentor-assignments.ts            # dry run, reports only
 *   npx ts-node scripts/fix-duplicate-mentor-assignments.ts --apply    # actually deactivates
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const active = await prisma.mentorAssignment.findMany({
    where: { active: true },
    select: {
      id: true,
      teamId: true,
      mentorType: true,
      mentorUserId: true,
      assignedAt: true,
      createdAt: true,
      mentor: { select: { fullName: true, email: true } },
      team: { select: { teamCode: true, name: true } },
    },
    orderBy: [{ assignedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const groups = new Map<string, typeof active>();
  for (const row of active) {
    const key = `${row.teamId}:${row.mentorType}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const toDeactivate: { id: string }[] = [];
  let duplicateGroups = 0;

  for (const [key, rows] of groups) {
    const distinctMentors = new Set(rows.map((r) => r.mentorUserId));
    if (distinctMentors.size <= 1) continue; // same person in both slots, or just one row — not a bug
    duplicateGroups += 1;

    const [keep, ...drop] = rows; // already sorted assignedAt desc, createdAt desc
    const [teamId, mentorType] = key.split(':');
    console.log(
      `[fix-duplicate-mentor-assignments] team=${teamId} (${rows[0].team.teamCode}) mentorType=${mentorType}: ` +
        `keeping ${keep.mentor.fullName} <${keep.mentor.email}> (assignment ${keep.id}), ` +
        `deactivating ${drop.map((d) => `${d.mentor.fullName} <${d.mentor.email}> (${d.id})`).join(', ')}`,
    );
    toDeactivate.push(...drop.map((d) => ({ id: d.id })));
  }

  console.log(
    `[fix-duplicate-mentor-assignments] ${duplicateGroups} duplicate group(s) found, ` +
      `${toDeactivate.length} assignment(s) to deactivate.`,
  );

  if (!apply) {
    console.log('[fix-duplicate-mentor-assignments] dry run only — re-run with --apply to write changes.');
    return;
  }

  if (toDeactivate.length) {
    await prisma.mentorAssignment.updateMany({
      where: { id: { in: toDeactivate.map((d) => d.id) } },
      data: { active: false },
    });
    console.log(`[fix-duplicate-mentor-assignments] deactivated ${toDeactivate.length} assignment(s).`);
  }
}

main()
  .catch((err) => {
    console.error('[fix-duplicate-mentor-assignments] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
