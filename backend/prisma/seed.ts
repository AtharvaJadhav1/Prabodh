import { PrismaClient, PlatformRole, PsCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@institute.edu' },
    update: {},
    create: {
      clerkUserId: 'dev_admin',
      email: 'admin@institute.edu',
      fullName: 'SIH Admin',
      platformRole: PlatformRole.admin,
      institute: 'Demo Institute',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'leader@institute.edu' },
    update: {},
    create: {
      clerkUserId: 'dev_student',
      email: 'leader@institute.edu',
      fullName: 'Team Leader',
      platformRole: PlatformRole.student,
      institute: 'Demo Institute',
      department: 'CSE',
    },
  });

  const instMentor = await prisma.user.upsert({
    where: { email: 'faculty@institute.edu' },
    update: {},
    create: {
      clerkUserId: 'dev_inst_mentor',
      email: 'faculty@institute.edu',
      fullName: 'Institute Mentor',
      platformRole: PlatformRole.institute_mentor,
      institute: 'Demo Institute',
      domainTags: ['HealthTech', 'AgriTech'],
    },
  });

  const indMentor = await prisma.user.upsert({
    where: { email: 'industry@partner.com' },
    update: {},
    create: {
      clerkUserId: 'dev_ind_mentor',
      email: 'industry@partner.com',
      fullName: 'Industry Mentor',
      platformRole: PlatformRole.industry_mentor,
      domainTags: ['HealthTech'],
    },
  });

  await prisma.problemStatement.upsert({
    where: { code: 'SIH2026-CS-014' },
    update: {},
    create: {
      code: 'SIH2026-CS-014',
      title: 'AI-assisted rural health triage',
      theme: 'HealthTech',
      category: PsCategory.software,
      organisation: 'MoHFW',
      description: 'Build a lightweight triage assistant for PHC workers.',
      teamCap: 8,
    },
  });

  await prisma.problemStatement.upsert({
    where: { code: 'SIH2026-HW-003' },
    update: {},
    create: {
      code: 'SIH2026-HW-003',
      title: 'Low-cost soil moisture sensor network',
      theme: 'AgriTech',
      category: PsCategory.hardware,
      organisation: 'ICAR',
      description: 'Design a field-deployable moisture sensing kit.',
      teamCap: 5,
    },
  });

  const stages = [
    { name: 'Idea Submission', sequence: 1, deadline: daysFromNow(14) },
    { name: 'Internal Hackathon', sequence: 2, deadline: daysFromNow(28) },
    { name: 'Institute Level', sequence: 3, deadline: daysFromNow(45) },
    { name: 'SIH Finale', sequence: 4, deadline: daysFromNow(90) },
  ];
  for (const s of stages) {
    const existing = await prisma.stage.findUnique({ where: { sequence: s.sequence } });
    if (!existing) {
      const stage = await prisma.stage.create({ data: s });
      await prisma.rubric.createMany({
        data: [
          { stageId: stage.id, criteria: 'Innovation', weightage: 30 },
          { stageId: stage.id, criteria: 'Feasibility', weightage: 25 },
          { stageId: stage.id, criteria: 'Impact', weightage: 25 },
          { stageId: stage.id, criteria: 'Presentation', weightage: 20 },
        ],
      });
    }
  }

  const settings = {
    member_cap: '6',
    institute_mentor_cap: '1',
    industry_mentor_cap: '1',
    invite_ttl_hours: '72',
    draft_hold_hours: '48',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  console.log('Seeded users:', {
    adminId: admin.id,
    studentId: student.id,
    instMentorId: instMentor.id,
    indMentorId: indMentor.id,
  });
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
