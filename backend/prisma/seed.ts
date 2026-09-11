import { PrismaClient, PlatformRole, PsCategory } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Prabodh@123';

const INSTITUTE = 'MIT Art, Design and Technology University';

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

const problemStatements: Array<{
  code: string;
  title: string;
  theme: string;
  category: PsCategory;
  organisation: string;
  description: string;
  teamCap: number;
}> = [
  {
    code: 'SIH2026-CS-001',
    title: 'AI-assisted rural health triage',
    theme: 'HealthTech',
    category: PsCategory.software,
    organisation: 'MoHFW',
    description: 'Build a lightweight triage assistant that helps PHC workers prioritize cases with limited connectivity.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-HW-001',
    title: 'Low-cost soil moisture sensor network',
    theme: 'AgriTech',
    category: PsCategory.hardware,
    organisation: 'ICAR',
    description: 'Design a field-deployable moisture sensing kit with solar charging and village-level dashboards.',
    teamCap: 6,
  },
  {
    code: 'SIH2026-CS-002',
    title: 'Multilingual civic grievance chatbot',
    theme: 'Smart Governance',
    category: PsCategory.software,
    organisation: 'MeitY',
    description: 'Create a Marathi/Hindi/English chatbot that routes municipal complaints and tracks SLA status.',
    teamCap: 10,
  },
  {
    code: 'SIH2026-CS-003',
    title: 'Campus waste segregation verifier',
    theme: 'Sustainability',
    category: PsCategory.software,
    organisation: 'MoEFCC',
    description: 'Use computer vision to verify wet/dry segregation at campus bins and report contamination rates.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-HW-002',
    title: 'Assistive navigation band for visually impaired students',
    theme: 'Assistive Tech',
    category: PsCategory.hardware,
    organisation: 'DEPwD',
    description: 'Prototype a wearable that combines ultrasonic ranging and haptic cues for indoor campus navigation.',
    teamCap: 5,
  },
  {
    code: 'SIH2026-CS-004',
    title: 'UPI fraud pattern early-warning tool',
    theme: 'FinTech',
    category: PsCategory.software,
    organisation: 'RBI Innovation Hub',
    description: 'Detect mule-account and social-engineering patterns in synthetic UPI logs and explain alerts to users.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-CS-005',
    title: 'Open-source flood inundation notifier',
    theme: 'Disaster Management',
    category: PsCategory.software,
    organisation: 'NDMA',
    description: 'Combine rainfall, river-gauge, and DEM data to send street-level flood risk SMS to local bodies.',
    teamCap: 7,
  },
  {
    code: 'SIH2026-HW-003',
    title: 'Low-power cold-chain logger for vaccines',
    theme: 'HealthTech',
    category: PsCategory.hardware,
    organisation: 'MoHFW',
    description: 'Build a temperature logger with local buffer storage that flags cold-chain breaks during last-mile delivery.',
    teamCap: 5,
  },
  {
    code: 'SIH2026-CS-006',
    title: 'Skill-gap recommender for polytechnic students',
    theme: 'Smart Education',
    category: PsCategory.software,
    organisation: 'MSDE',
    description: 'Map student transcripts to NSDC job roles and recommend free courses plus local internship openings.',
    teamCap: 10,
  },
  {
    code: 'SIH2026-CS-007',
    title: 'Farm-gate price transparency board',
    theme: 'AgriTech',
    category: PsCategory.software,
    organisation: 'Ministry of Agriculture',
    description: 'Show nearby mandi prices, transport cost estimates, and fair-price alerts for smallholder farmers.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-HW-004',
    title: 'Modular rooftop rainwater quality kit',
    theme: 'Sustainability',
    category: PsCategory.hardware,
    organisation: 'CGWB',
    description: 'Sense turbidity and TDS in harvested rainwater and indicate when first-flush diversion is needed.',
    teamCap: 6,
  },
  {
    code: 'SIH2026-CS-008',
    title: 'Heritage site crowd-flow planner',
    theme: 'Tourism',
    category: PsCategory.software,
    organisation: 'Ministry of Tourism',
    description: 'Predict peak-hour congestion at monuments and suggest timed-entry slots for visitors and staff.',
    teamCap: 7,
  },
  {
    code: 'SIH2026-CS-009',
    title: 'Women safety corridor mapper for night travel',
    theme: 'Women Safety',
    category: PsCategory.software,
    organisation: 'MHA',
    description: 'Rank well-lit, CCTV-covered walking routes between hostels, metro, and bus stops using open map data.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-CS-010',
    title: 'MSMEs GST filing copilot',
    theme: 'FinTech',
    category: PsCategory.software,
    organisation: 'GSTN',
    description: 'Help micro businesses reconcile invoices, flag mismatch risks, and generate a filing checklist in plain language.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-HW-005',
    title: 'Portable water-quality strip reader',
    theme: 'HealthTech',
    category: PsCategory.hardware,
    organisation: 'Jal Jeevan Mission',
    description: 'Read colorimetric strips with a phone-attached optic and log village water quality for PHED officers.',
    teamCap: 6,
  },
  {
    code: 'SIH2026-CS-011',
    title: 'Exam malpractice signal dashboard',
    theme: 'Smart Education',
    category: PsCategory.software,
    organisation: 'AICTE',
    description: 'Use anonymized device and seating-pattern signals to highlight halls that need human invigilation focus.',
    teamCap: 6,
  },
  {
    code: 'SIH2026-CS-012',
    title: 'Public EV charger availability predictor',
    theme: 'Smart Cities',
    category: PsCategory.software,
    organisation: 'MoP',
    description: 'Forecast charger occupancy in a city using historical sessions and help drivers plan charging stops.',
    teamCap: 8,
  },
  {
    code: 'SIH2026-HW-006',
    title: 'Low-cost greenhouse climate node',
    theme: 'AgriTech',
    category: PsCategory.hardware,
    organisation: 'ICAR',
    description: 'Sense temperature, humidity, and CO2 in polyhouses and actuate fans or misters on a simple rule engine.',
    teamCap: 5,
  },
  {
    code: 'SIH2026-CS-013',
    title: 'Open contracting bid-anomaly finder',
    theme: 'Smart Governance',
    category: PsCategory.software,
    organisation: 'CVC',
    description: 'Flag unusual bid clustering, repeat winners, and last-minute bid patterns in published tender data.',
    teamCap: 7,
  },
  {
    code: 'SIH2026-CS-014',
    title: 'Mental-health first-response companion for campuses',
    theme: 'HealthTech',
    category: PsCategory.software,
    organisation: 'MoHFW',
    description: 'Provide confidential screening, campus counsellor routing, and crisis escalation without storing chat transcripts.',
    teamCap: 8,
  },
];

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

async function main() {
  const admin = await upsertUser({
    clerkUserId: 'dev_admin',
    email: 'admin@institute.edu',
    fullName: 'SIH Admin',
    platformRole: PlatformRole.admin,
    institute: INSTITUTE,
    department: 'Nodal Cell',
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

  for (const ps of problemStatements) {
    await prisma.problemStatement.upsert({
      where: { code: ps.code },
      update: {
        title: ps.title,
        theme: ps.theme,
        category: ps.category,
        organisation: ps.organisation,
        description: ps.description,
        teamCap: ps.teamCap,
      },
      create: ps,
    });
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
  }

  console.log('Seed complete', {
    adminId: admin.id,
    students: studentRows.length,
    faculty: facultyRows.length,
    problemStatements: problemStatements.length,
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
