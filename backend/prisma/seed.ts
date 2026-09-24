import { PrismaClient, PlatformRole } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Prabodh@123';

const INSTITUTE = 'MIT Art, Design and Technology University';

const industrialProfiles: Record<string, { companyName: string; designation: string }> = {
  'industry@partner.com': { companyName: 'Partner Health Systems', designation: 'Chief Innovation Officer' },
  'leena.kapoor@partnertech.in': { companyName: 'PartnerTech Pvt Ltd', designation: 'Head of Engineering' },
};

const students: Array<{ email: string; fullName: string; department: string }> = [
  { email: 'aarav.sharma@mituniversity.edu.in', fullName: 'Aarav Sharma', department: 'CSE' },
  { email: 'diya.patil@mituniversity.edu.in', fullName: 'Diya Patil', department: 'CSE' },
  { email: 'kabir.deshmukh@mituniversity.edu.in', fullName: 'Kabir Deshmukh', department: 'IT' },
  { email: 'ananya.iyer@mituniversity.edu.in', fullName: 'Ananya Iyer', department: 'AI & DS' },
  { email: 'rohan.kulkarni@mituniversity.edu.in', fullName: 'Rohan Kulkarni', department: 'ECE' },
  { email: 'meera.nair@mituniversity.edu.in', fullName: 'Meera Nair', department: 'CSE' },
  { email: 'ishaan.joshi@mituniversity.edu.in', fullName: 'Ishaan Joshi', department: 'IT' },
  { email: 'sara.khan@mituniversity.edu.in', fullName: 'Sara Khan', department: 'AI & DS' },
  { email: 'dev.more@mituniversity.edu.in', fullName: 'Dev More', department: 'Mechanical' },
  { email: 'priya.bhosale@mituniversity.edu.in', fullName: 'Priya Bhosale', department: 'CSE' },
  { email: 'arjun.rao@mituniversity.edu.in', fullName: 'Arjun Rao', department: 'ECE' },
  { email: 'nisha.gupta@mituniversity.edu.in', fullName: 'Nisha Gupta', department: 'IT' },
  { email: 'vivek.sawant@mituniversity.edu.in', fullName: 'Vivek Sawant', department: 'CSE' },
  { email: 'tanya.mehta@mituniversity.edu.in', fullName: 'Tanya Mehta', department: 'AI & DS' },
  { email: 'leader@institute.edu', fullName: 'Team Leader', department: 'CSE' },
  { email: 'newlead@institute.edu', fullName: 'New Team Lead', department: 'CSE' },
  { email: 'newlead2@institute.edu', fullName: 'New Team Lead 2', department: 'CSE' },
  { email: 'newstudent@institute.edu', fullName: 'New Demo Student', department: 'CSE' },
];

const faculty: Array<{
  email: string;
  fullName: string;
  department: string;
  role: PlatformRole;
  domainTags: string[];
}> = [
  {
    email: 'faculty@institute.edu',
    fullName: 'Institute Mentor',
    department: 'CSE',
    role: PlatformRole.institute_mentor,
    domainTags: ['HealthTech', 'AgriTech'],
  },
  {
    email: 'newmentor@institute.edu',
    fullName: 'New Institute Mentor',
    department: 'CSE',
    role: PlatformRole.institute_mentor,
    domainTags: ['HealthTech', 'AgriTech'],
  },
  {
    email: 'neha.kulkarni@mituniversity.edu.in',
    fullName: 'Dr. Neha Kulkarni',
    department: 'Computer Science',
    role: PlatformRole.institute_mentor,
    domainTags: ['HealthTech', 'AI', 'Software'],
  },
  {
    email: 'rajesh.patil@mituniversity.edu.in',
    fullName: 'Prof. Rajesh Patil',
    department: 'Information Technology',
    role: PlatformRole.institute_mentor,
    domainTags: ['Smart Education', 'Cybersecurity'],
  },
  {
    email: 'sunita.desai@mituniversity.edu.in',
    fullName: 'Dr. Sunita Desai',
    department: 'Electronics',
    role: PlatformRole.institute_mentor,
    domainTags: ['IoT', 'Hardware', 'AgriTech'],
  },
  {
    email: 'amit.joshi@mituniversity.edu.in',
    fullName: 'Prof. Amit Joshi',
    department: 'AI & Data Science',
    role: PlatformRole.institute_mentor,
    domainTags: ['FinTech', 'NLP', 'AI'],
  },
  {
    email: 'kavita.shinde@mituniversity.edu.in',
    fullName: 'Dr. Kavita Shinde',
    department: 'Mechanical',
    role: PlatformRole.institute_mentor,
    domainTags: ['Sustainability', 'Hardware', 'Robotics'],
  },
  {
    email: 'sanjay.verma@mituniversity.edu.in',
    fullName: 'Prof. Sanjay Verma',
    department: 'Computer Science',
    role: PlatformRole.institute_mentor,
    domainTags: ['Smart Cities', 'Governance', 'Software'],
  },
  {
    email: 'industry@partner.com',
    fullName: 'Industry Mentor',
    department: 'Partnerships',
    role: PlatformRole.industry_mentor,
    domainTags: ['HealthTech'],
  },
  {
    email: 'leena.kapoor@partnertech.in',
    fullName: 'Leena Kapoor',
    department: 'Industry Mentorship',
    role: PlatformRole.industry_mentor,
    domainTags: ['FinTech', 'Cloud'],
  },
];

/* Problem statements are loaded from the SIH'26 source CSV via
 * `npx tsx scripts/import-ps.ts` — see backend/scripts/import-ps.ts. */

async function upsertUser(data: {
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string;
  department?: string;
  domainTags?: string[];
  clerkUserId: string;
}) {
  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      fullName: data.fullName,
      platformRole: data.platformRole,
      institute: data.institute,
      department: data.department,
      domainTags: data.domainTags ?? [],
      isActive: true,
      passwordHash,
    },
    create: { ...data, passwordHash },
  });
}

async function ensureDemoTeam(opts: {
  teamCode: string;
  teamName: string;
  adminId: string;
  leader: { id: string; email: string };
  mentor?: { id: string } | undefined;
}) {
  const team = await prisma.team.upsert({
    where: { teamCode: opts.teamCode },
    update: { name: opts.teamName, institute: INSTITUTE, leaderUserId: opts.leader.id },
    create: {
      clerkOrgId: `local-org-${opts.teamCode}`,
      teamCode: opts.teamCode,
      name: opts.teamName,
      institute: INSTITUTE,
      leaderUserId: opts.leader.id,
      members: {
        create: {
          userId: opts.leader.id,
          invitedEmail: opts.leader.email,
          inviteStatus: 'accepted',
          joinedAt: new Date(),
        },
      },
    },
  });
  if (opts.mentor) {
    const existing = await prisma.mentorAssignment.findFirst({
      where: { teamId: team.id, mentorUserId: opts.mentor.id, active: true },
    });
    if (!existing) {
      await prisma.mentorAssignment.create({
        data: {
          teamId: team.id,
          mentorUserId: opts.mentor.id,
          mentorType: 'institute',
          assignedById: opts.adminId,
          assignmentMethod: 'manual',
        },
      });
    }
  }
  return team;
}

async function main() {
  const admin = await upsertUser({
    clerkUserId: 'dev_admin',
    email: 'admin@institute.edu',
    fullName: 'SIH Admin',
    platformRole: PlatformRole.admin,
    institute: INSTITUTE,
    department: 'Nodal Cell',
  });

  const studentExpert = await upsertUser({
    clerkUserId: 'seed:expert@institute.edu',
    email: 'expert@institute.edu',
    fullName: 'Student Expert',
    platformRole: PlatformRole.student_expert,
    institute: INSTITUTE,
    department: 'Expert Cell',
  });

  const studentRows = [];
  for (const s of students) {
    studentRows.push(
      await upsertUser({
        clerkUserId: `seed:${s.email}`,
        email: s.email,
        fullName: s.fullName,
        platformRole: PlatformRole.student,
        institute: INSTITUTE,
        department: s.department,
      }),
    );
  }

  const facultyRows = [];
  for (const f of faculty) {
    facultyRows.push(
      await upsertUser({
        clerkUserId: `seed:${f.email}`,
        email: f.email,
        fullName: f.fullName,
        platformRole: f.role,
        institute: INSTITUTE,
        department: f.department,
        domainTags: f.domainTags,
      }),
    );
  }

  for (const f of facultyRows) {
    if (f.platformRole === PlatformRole.industry_mentor) {
      const profile = industrialProfiles[f.email];
      await prisma.industrialMentor.upsert({
        where: { userId: f.id },
        update: {
          fullName: f.fullName,
          email: f.email,
          companyName: profile?.companyName ?? f.institute,
          designation: profile?.designation ?? f.department,
          domainExpertise: f.domainTags,
          isActive: true,
        },
        create: {
          userId: f.id,
          fullName: f.fullName,
          email: f.email,
          companyName: profile?.companyName ?? f.institute,
          designation: profile?.designation ?? f.department,
          domainExpertise: f.domainTags,
          isActive: true,
        },
      });
    }
  }

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

  const leader = studentRows.find((u) => u.email === 'leader@institute.edu');
  const mentor = facultyRows.find((u) => u.email === 'faculty@institute.edu');
  if (leader) {
    const teamCode = 'DEMO01';
    const team = await prisma.team.upsert({
      where: { teamCode },
      update: { name: 'Demo SIH Team', institute: INSTITUTE, leaderUserId: leader.id },
      create: {
        clerkOrgId: `local-org-${teamCode}`,
        teamCode,
        name: 'Demo SIH Team',
        institute: INSTITUTE,
        leaderUserId: leader.id,
        members: {
          create: {
            userId: leader.id,
            invitedEmail: leader.email,
            inviteStatus: 'accepted',
            joinedAt: new Date(),
          },
        },
      },
    });
    if (mentor) {
      const existing = await prisma.mentorAssignment.findFirst({
        where: { teamId: team.id, mentorUserId: mentor.id, active: true },
      });
      if (!existing) {
        await prisma.mentorAssignment.create({
          data: {
            teamId: team.id,
            mentorUserId: mentor.id,
            mentorType: 'institute',
            assignedById: admin.id,
            assignmentMethod: 'manual',
          },
        });
      }
    }
    const industryMentor = facultyRows.find((u) => u.email === 'leena.kapoor@partnertech.in');
    if (industryMentor) {
      const industrialProfile = await prisma.industrialMentor.findUnique({ where: { userId: industryMentor.id } });
      const existingIndustry = await prisma.mentorAssignment.findFirst({
        where: { teamId: team.id, mentorType: 'industry', active: true },
      });
      if (!existingIndustry && industrialProfile) {
        await prisma.mentorAssignment.create({
          data: {
            teamId: team.id,
            mentorUserId: industryMentor.id,
            mentorType: 'industry',
            assignedById: admin.id,
            assignmentMethod: 'manual',
            industrialMentorId: industrialProfile.id,
          },
        });
      }
      await prisma.team.update({
        where: { id: team.id },
        data: { industrialMentorId: industrialProfile?.id ?? null },
      });
    }
  }

  const newLeadA = studentRows.find((u) => u.email === 'newlead@institute.edu');
  const newLeadB = studentRows.find((u) => u.email === 'newlead2@institute.edu');
  const newMentor = facultyRows.find((u) => u.email === 'newmentor@institute.edu');
  if (newLeadA) {
    await ensureDemoTeam({
      teamCode: 'DEMO02',
      teamName: 'New Demo Team',
      adminId: admin.id,
      leader: { id: newLeadA.id, email: newLeadA.email },
      mentor: newMentor,
    });
  }
  if (newLeadB) {
    await ensureDemoTeam({
      teamCode: 'DEMO03',
      teamName: 'New Demo Team 2',
      adminId: admin.id,
      leader: { id: newLeadB.id, email: newLeadB.email },
      mentor: newMentor,
    });
  }

  console.log('Seed complete', {
    adminId: admin.id,
    studentExpertId: studentExpert.id,
    students: studentRows.length,
    faculty: facultyRows.length,
    defaultPassword: DEFAULT_PASSWORD,
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
