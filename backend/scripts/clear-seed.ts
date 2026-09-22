/**
 * Deletes demo/seed data created by prisma/seed.ts.
 * Keeps admin@institute.edu so the nodal admin account remains usable.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEEP_EMAILS = new Set(['admin@institute.edu']);

const SEED_EMAILS = [
  'aarav.sharma@mituniversity.edu.in',
  'diya.patil@mituniversity.edu.in',
  'kabir.deshmukh@mituniversity.edu.in',
  'ananya.iyer@mituniversity.edu.in',
  'rohan.kulkarni@mituniversity.edu.in',
  'meera.nair@mituniversity.edu.in',
  'ishaan.joshi@mituniversity.edu.in',
  'sara.khan@mituniversity.edu.in',
  'dev.more@mituniversity.edu.in',
  'priya.bhosale@mituniversity.edu.in',
  'arjun.rao@mituniversity.edu.in',
  'nisha.gupta@mituniversity.edu.in',
  'vivek.sawant@mituniversity.edu.in',
  'tanya.mehta@mituniversity.edu.in',
  'leader@institute.edu',
  'newlead@institute.edu',
  'newlead2@institute.edu',
  'newstudent@institute.edu',
  'faculty@institute.edu',
  'newmentor@institute.edu',
  'neha.kulkarni@mituniversity.edu.in',
  'rajesh.patil@mituniversity.edu.in',
  'sunita.desai@mituniversity.edu.in',
  'amit.joshi@mituniversity.edu.in',
  'kavita.shinde@mituniversity.edu.in',
  'sanjay.verma@mituniversity.edu.in',
  'industry@partner.com',
  'leena.kapoor@partnertech.in',
];

const SEED_TEAM_CODES = ['DEMO01', 'DEMO02', 'DEMO03'];

async function main() {
  const seedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { clerkUserId: { startsWith: 'seed:' } },
        { email: { in: SEED_EMAILS } },
      ],
      NOT: { email: { in: [...KEEP_EMAILS] } },
    },
    select: { id: true, email: true, clerkUserId: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);

  const seedTeams = await prisma.team.findMany({
    where: {
      OR: [
        { teamCode: { in: SEED_TEAM_CODES } },
        { clerkOrgId: { startsWith: 'local-org-DEMO' } },
        ...(seedUserIds.length ? [{ leaderUserId: { in: seedUserIds } }] : []),
      ],
    },
    select: { id: true, teamCode: true },
  });
  const seedTeamIds = [...new Set(seedTeams.map((t) => t.id))];

  console.log('[clear-seed] users=', seedUsers.length, 'teams=', seedTeams.length);
  console.log(
    '[clear-seed] user emails=',
    seedUsers.map((u) => u.email).join(', ') || '(none)',
  );
  console.log(
    '[clear-seed] team codes=',
    seedTeams.map((t) => t.teamCode).join(', ') || '(none)',
  );

  if (!seedUsers.length && !seedTeams.length) {
    console.log('[clear-seed] nothing to delete');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      if (seedTeamIds.length) {
        await tx.comment.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.evaluation.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.stageResult.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.deliverable.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.teamStageStatus.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.teamPsPreference.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.ideaSubmission.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.mentorInvite.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.mentorAssignment.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.joinRequest.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.teamMember.deleteMany({ where: { teamId: { in: seedTeamIds } } });
        await tx.team.updateMany({
          where: { id: { in: seedTeamIds } },
          data: { industrialMentorId: null, facultyMentorId: null, psId: null },
        });
        await tx.team.deleteMany({ where: { id: { in: seedTeamIds } } });
      }

      if (seedUserIds.length) {
        await tx.team.updateMany({
          where: { facultyMentorId: { in: seedUserIds } },
          data: { facultyMentorId: null },
        });

        const industrial = await tx.industrialMentor.findMany({
          where: { userId: { in: seedUserIds } },
          select: { id: true },
        });
        const industrialIds = industrial.map((i) => i.id);
        if (industrialIds.length) {
          await tx.team.updateMany({
            where: { industrialMentorId: { in: industrialIds } },
            data: { industrialMentorId: null },
          });
          await tx.mentorAssignment.updateMany({
            where: { industrialMentorId: { in: industrialIds } },
            data: { industrialMentorId: null },
          });
        }

        await tx.comment.deleteMany({ where: { authorUserId: { in: seedUserIds } } });
        await tx.notification.deleteMany({ where: { userId: { in: seedUserIds } } });
        await tx.notificationLog.deleteMany({ where: { recipientUserId: { in: seedUserIds } } });
        await tx.broadcast.deleteMany({ where: { adminUserId: { in: seedUserIds } } });
        await tx.auditLog.deleteMany({ where: { actorUserId: { in: seedUserIds } } });
        await tx.evaluation.deleteMany({ where: { evaluatorUserId: { in: seedUserIds } } });
        await tx.stageResult.updateMany({
          where: { publishedById: { in: seedUserIds } },
          data: { publishedById: null },
        });
        await tx.mentorInvite.deleteMany({
          where: {
            OR: [{ invitedById: { in: seedUserIds } }, { mentorUserId: { in: seedUserIds } }],
          },
        });
        await tx.mentorAssignment.deleteMany({
          where: {
            OR: [{ mentorUserId: { in: seedUserIds } }, { assignedById: { in: seedUserIds } }],
          },
        });
        await tx.joinRequest.deleteMany({ where: { studentId: { in: seedUserIds } } });
        await tx.teamMember.deleteMany({ where: { userId: { in: seedUserIds } } });
        await tx.teamPsPreference.deleteMany({
          where: {
            OR: [{ submittedById: { in: seedUserIds } }, { decidedById: { in: seedUserIds } }],
          },
        });
        await tx.ideaSubmission.updateMany({
          where: { authorUserId: { in: seedUserIds } },
          data: { authorUserId: null },
        });
        await tx.industrialMentor.deleteMany({ where: { userId: { in: seedUserIds } } });
        await tx.userImportBatch.deleteMany({ where: { adminUserId: { in: seedUserIds } } });

        const leftoverTeams = await tx.team.findMany({
          where: { leaderUserId: { in: seedUserIds } },
          select: { id: true },
        });
        if (leftoverTeams.length) {
          const ids = leftoverTeams.map((t) => t.id);
          await tx.comment.deleteMany({ where: { teamId: { in: ids } } });
          await tx.evaluation.deleteMany({ where: { teamId: { in: ids } } });
          await tx.stageResult.deleteMany({ where: { teamId: { in: ids } } });
          await tx.deliverable.deleteMany({ where: { teamId: { in: ids } } });
          await tx.teamStageStatus.deleteMany({ where: { teamId: { in: ids } } });
          await tx.teamPsPreference.deleteMany({ where: { teamId: { in: ids } } });
          await tx.ideaSubmission.deleteMany({ where: { teamId: { in: ids } } });
          await tx.mentorInvite.deleteMany({ where: { teamId: { in: ids } } });
          await tx.mentorAssignment.deleteMany({ where: { teamId: { in: ids } } });
          await tx.joinRequest.deleteMany({ where: { teamId: { in: ids } } });
          await tx.teamMember.deleteMany({ where: { teamId: { in: ids } } });
          await tx.team.updateMany({
            where: { id: { in: ids } },
            data: { industrialMentorId: null, facultyMentorId: null, psId: null },
          });
          await tx.team.deleteMany({ where: { id: { in: ids } } });
        }

        await tx.user.deleteMany({ where: { id: { in: seedUserIds } } });
      }

      await tx.problemStatement.deleteMany({
        where: { code: { startsWith: 'SIH2026-CS-' } },
      });
    },
    { timeout: 120_000 },
  );

  const remainingSeed = await prisma.user.count({
    where: {
      OR: [{ clerkUserId: { startsWith: 'seed:' } }, { email: { in: SEED_EMAILS } }],
      NOT: { email: { in: [...KEEP_EMAILS] } },
    },
  });
  const remainingDemoTeams = await prisma.team.count({
    where: { teamCode: { in: SEED_TEAM_CODES } },
  });
  const adminLeft = await prisma.user.findUnique({
    where: { email: 'admin@institute.edu' },
    select: { email: true, fullName: true, platformRole: true },
  });
  const totals = {
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
  };

  console.log('[clear-seed] remaining seed users=', remainingSeed);
  console.log('[clear-seed] remaining DEMO teams=', remainingDemoTeams);
  console.log('[clear-seed] kept admin=', adminLeft);
  console.log('[clear-seed] db totals=', totals);
}

main()
  .catch((err) => {
    console.error('[clear-seed] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
