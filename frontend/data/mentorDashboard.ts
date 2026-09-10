export const mentor = {
  name: "Dr. Ranjana Kale",
  initials: "RK",
  title: "Associate Professor (IT)",
  empId: "MIT-FAC-7814",
  role: "Institute Evaluator",
};

export type MentorGroup = {
  teamName: string;
  teamId: string;
  capacity: string;
  track: string;
  problemCode: string;
  problemTitle: string;
  leader: string;
  leaderPrn: string;
  milestone: string;
  domains: string[];
  score?: number;
  grade?: string;
  publishStatus?: "submitted" | "published";
};

export type GroupStatus = "pending" | "evaluated";

export const pendingGroups: MentorGroup[] = [
  {
    teamName: "Nex-Aura",
    teamId: "SIH-2026-BCAIAA89",
    capacity: "4/6",
    track: "Software / AI & FinTech",
    problemCode: "FR-08",
    problemTitle: "Conversational AI-Powered Quantitative Trading & Real-Time Portfolio Stress Testing",
    leader: "Aarav Agarwal",
    leaderPrn: "ADT23SOCB0287",
    milestone: "Stage 1 Architecture & PPT",
    domains: ["NLP", "FinTech"],
  },
  {
    teamName: "PulseMedics",
    teamId: "SIH-2026-MEDT1980",
    capacity: "6/6",
    track: "Healthcare & IoT",
    problemCode: "SIH-1310",
    problemTitle: "Edge-AI Wearable for ICU Early Sepsis Detection and Real-Time Vital Triage Alerts",
    leader: "Devashish Joshi",
    leaderPrn: "MITU22EC0114",
    milestone: "Hardware BOM & Spec Sheet",
    domains: ["Healthcare", "IoT"],
  },
  {
    teamName: "CyberShield",
    teamId: "SIH-2026-SEC9902",
    capacity: "6/6",
    track: "Cyber Security & Defense",
    problemCode: "SIH-1801",
    problemTitle: "Automated AI Honeynet & Ransomware Canary Token Injection for Critical Infrastructure",
    leader: "Arman Khan",
    leaderPrn: "MITU22BTIT0604",
    milestone: "Stage 1 PoC Architecture",
    domains: ["Cyber Security", "Defense"],
  },
];

export const nanoMindsGroup: MentorGroup = {
  teamName: "NanoMinds",
  teamId: "SIH-2026-BCAIAA24",
  capacity: "4/4",
  track: "Software / AI & FinTech",
  problemCode: "FR-12",
  problemTitle: "PriceWise MSME: Dynamic Pricing Engine with Automated Price Sensitivity Algorithm",
  leader: "Riya Deshmukh",
  leaderPrn: "MITU22BTCS0445",
  milestone: "Stage 1 Architecture & PPT",
  domains: ["FinTech", "AI"],
};

export const evaluatedGroups: MentorGroup[] = [
  {
    teamName: "ByteForce",
    teamId: "SIH-2026-BCCS4F08",
    capacity: "6/6",
    track: "Smart Governance",
    problemCode: "SIH-1422",
    problemTitle: "Decentralized Public Grievance Redressal Protocol with Zero-Knowledge Verification",
    leader: "Varun Kulkarni",
    leaderPrn: "MITU22BTCS0912",
    milestone: "",
    domains: ["Smart Governance", "Web3"],
    score: 88,
    grade: "A",
    publishStatus: "published",
  },
  {
    teamName: "AgroBotix",
    teamId: "SIH-2026-AGRO3310",
    capacity: "6/6",
    track: "AgriTech & Robotics",
    problemCode: "SIH-1550",
    problemTitle: "Autonomous Solar-Powered Drone Swarm for Precision Pest Spraying & Crop Health",
    leader: "Rohit Salunkhe",
    leaderPrn: "MITU22BTAG0311",
    milestone: "",
    domains: ["AgriTech", "Robotics"],
    score: 92,
    grade: "O",
    publishStatus: "submitted",
  },
  {
    teamName: "SolarVayu",
    teamId: "SIH-2026-ENRG7100",
    capacity: "6/6",
    track: "Clean & Green Tech",
    problemCode: "SIH-1644",
    problemTitle: "Hybrid Microgrid Dynamic Load Balancer for Rural Community Solar Mini-Grids",
    leader: "Pranav Tawde",
    leaderPrn: "MITU22BTEE0512",
    milestone: "",
    domains: ["Clean Tech", "IoT"],
    score: 84,
    grade: "B+",
    publishStatus: "published",
  },
];

export const allGroups = [nanoMindsGroup, ...pendingGroups, ...evaluatedGroups];

export const tracks = [
  "All Tracks",
  "AI & FinTech",
  "Smart Governance",
  "Healthcare & IoT",
  "AgriTech & Robotics",
  "Cyber Security",
  "Clean Tech",
];

export const metrics = {
  assignedTeams: 6,
  totalStudents: 34,
  pendingReviews: 3,
  milestoneDate: "Sep 15",
  daysLeft: 5,
};

export type MentorCohort = {
  teamName: string;
  problemCode: string;
  domain: string;
  status: "approved" | "pending";
  members: number;
};

export type MentorExpertise = {
  area: string;
  focusLevel: "Primary" | "Secondary";
  details: string;
};

export type MentorTrackRecordEntry = {
  season: string;
  teamName: string;
  outcome: string;
  result: "Winner" | "Finalist" | "Runner-up" | "Qualified";
};

export type IndustryMentor = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
  expertise: string[];
  mappedTeamIds: string[];
};

export type IndustryMentorInput = Omit<IndustryMentor, "id" | "mappedTeamIds">;

export const domainExpertiseOptions = [
  "NLP & LLMs",
  "AI Agents",
  "Distributed Systems",
  "Cybersecurity",
  "FinTech",
  "Robotics & IoT",
  "Healthcare",
  "AgriTech",
  "Smart Governance",
  "Clean Tech",
] as const;

export const initialIndustryMentors: IndustryMentor[] = [
  {
    id: "IM265",
    name: "Rahul Bhide",
    initials: "RB",
    email: "rahul.bhide@company.com",
    phone: "+91 98907 99553",
    company: "Prasu Soft Labs Pvt Ltd",
    designation: "Lead AI Architect",
    expertise: ["NLP & LLMs", "AI Agents", "Distributed Systems", "FinTech"],
    mappedTeamIds: ["SIH-2026-BCAIAA89"],
  },
  {
    id: "IM194",
    name: "Hemant Shanu",
    initials: "HS",
    email: "hemant.s@cognishield.io",
    phone: "+91 94220 81109",
    company: "CogniShield Cyber Tech",
    designation: "VP, Security Architecture",
    expertise: ["Cybersecurity", "Distributed Systems", "Smart Governance", "FinTech"],
    mappedTeamIds: ["SIH-2026-BCCS4F08", "SIH-2026-SEC9902"],
  },
];

export type MentorProfile = {
  initials: string;
  fullName: string;
  verified: boolean;
  designation: string;
  department: string;
  facultyId: string;
  roleBadge: string;
  email: string;
  location: string;
  socials: { label: string; href: string }[];
  stats: {
    assignedTeams: number;
    teamsLabel: string;
    pendingReviews: number;
    reviewsLabel: string;
    studentsGuided: number;
    studentsLabel: string;
    tracksCount: number;
  };
  nextAction: string;
  cohorts: MentorCohort[];
  domainExpertise: MentorExpertise[];
  trackRecord: MentorTrackRecordEntry[];
};

export const mentorProfile: MentorProfile = {
  initials: "AS",
  fullName: "Dr. Aman Singh",
  verified: true,
  designation: "Associate Professor",
  department: "Department of Computer Science & Engineering",
  facultyId: "M161",
  roleBadge: "Internal Institute Guide",
  email: "dr.aman.singh@mituniversity.edu.in",
  location: "Block S-309",
  socials: [
    { label: "Scholar", href: "#" },
    { label: "ResearchGate", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],
  stats: {
    assignedTeams: 6,
    teamsLabel: "Active Teams (Full)",
    pendingReviews: 2,
    reviewsLabel: "Phase 1 Submissions",
    studentsGuided: 24,
    studentsLabel: "Registered Scholars",
    tracksCount: 3,
  },
  nextAction:
    "Review Internal Qualifier slide decks and rubric grade cards before Sept 15.",
  cohorts: [
    { teamName: "NeuralShift", problemCode: "SIH-1492", domain: "Applied AI & NLP • Distributed Systems", status: "approved", members: 4 },
    { teamName: "VaultChain", problemCode: "SIH-1520", domain: "Cybersecurity & Zero-Knowledge Proofs", status: "pending", members: 4 },
    { teamName: "MicroCloud", problemCode: "SIH-1601", domain: "Cloud Security & Microservices", status: "approved", members: 4 },
  ],
  domainExpertise: [
    {
      area: "Applied AI & Machine Learning",
      focusLevel: "Primary",
      details: "Deep learning, NLP pipelines, LLM orchestration, and MLOps for production hackathon systems.",
    },
    {
      area: "Cybersecurity & Zero-Knowledge Proofs",
      focusLevel: "Primary",
      details: "Threat modeling, secure system design, and privacy-preserving verification protocols.",
    },
    {
      area: "Cloud & Microservices Architecture",
      focusLevel: "Secondary",
      details: "Distributed systems, container orchestration, and resilient backend design on AWS/GCP.",
    },
  ],
  trackRecord: [
    {
      season: "SIH 2025",
      teamName: "NeuralShift",
      outcome: "National Finalist — Smart Mobility track",
      result: "Finalist",
    },
    {
      season: "SIH 2024",
      teamName: "VaultChain",
      outcome: "Institute Round Winner — Cybersecurity track",
      result: "Winner",
    },
    {
      season: "SIH 2023",
      teamName: "AgroBotix",
      outcome: "Grand Finale qualified — AgriTech track",
      result: "Qualified",
    },
  ],
};

export const mentorMaxCap = 5;

export type GroupRequest = {
  id: string;
  teamName: string;
  groupId: string;
  allocatedRole: string;
  track: "Priority Track" | "Standard Track";
  allocatedAt: string;
  leaderName: string;
  leaderPrn: string;
  leaderInitials: string;
  department: string;
  memberCount: number;
  problemTitle: string;
  domains: string[];
  repoType: string;
};

export type GroupRequestHistoryEntry = {
  groupId: string;
  teamName: string;
  leaderName: string;
  memberCount: number;
  allocatedRole: string;
  status: "ACCEPTED" | "DECLINED";
  receivedDate: string;
  respondedDate: string;
};

export const initialPendingRequests: GroupRequest[] = [
  {
    id: "REQ-001",
    teamName: "QuantumCoders",
    groupId: "LYMSC22",
    allocatedRole: "Internal Guide",
    track: "Priority Track",
    allocatedAt: "Today, 10:30 AM",
    leaderName: "Sheetal Jiji Ambre",
    leaderPrn: "MIT22BTCS0412",
    leaderInitials: "SA",
    department: "Dept of CSE",
    memberCount: 6,
    problemTitle:
      "Autonomous AI Honeynet & Ransomware Canary Token Injection for Critical Infrastructure",
    domains: ["Cyber Security", "Defense"],
    repoType: "Private GitLab",
  },
  {
    id: "REQ-002",
    teamName: "AgroSense AI",
    groupId: "SIH-2026-AGR03310",
    allocatedRole: "Technical Mentor",
    track: "Standard Track",
    allocatedAt: "Yesterday, 04:15 PM",
    leaderName: "Rohit Salunkhe",
    leaderPrn: "MITU22BTAG0311",
    leaderInitials: "RS",
    department: "Dept of AgriTech & Robotics",
    memberCount: 6,
    problemTitle:
      "Autonomous Solar Swarm for Precision Pest Spraying & Crop Health Analytics",
    domains: ["AgriTech", "Robotics & IoT"],
    repoType: "Hardware + IoT Component",
  },
];

export const initialRequestHistory: GroupRequestHistoryEntry[] = [
  {
    groupId: "LYMSC22",
    teamName: "NanoMinds",
    leaderName: "Sheetal Jiji Ambre",
    memberCount: 6,
    allocatedRole: "Internal Guide",
    status: "ACCEPTED",
    receivedDate: "08/07/2026",
    respondedDate: "08/07/2026",
  },
  {
    groupId: "LYMSC05",
    teamName: "Praxis",
    leaderName: "Aarav Agarwal",
    memberCount: 6,
    allocatedRole: "Industry Mentor",
    status: "ACCEPTED",
    receivedDate: "08/06/2026",
    respondedDate: "08/06/2026",
  },
  {
    groupId: "SY308",
    teamName: "Safepath",
    leaderName: "Devashish Joshi",
    memberCount: 5,
    allocatedRole: "Technical Evaluator",
    status: "DECLINED",
    receivedDate: "08/04/2026",
    respondedDate: "08/04/2026",
  },
  {
    groupId: "SY301",
    teamName: "SolarVayu",
    leaderName: "Pranav Tawde",
    memberCount: 6,
    allocatedRole: "Internal Guide",
    status: "ACCEPTED",
    receivedDate: "08/02/2026",
    respondedDate: "08/03/2026",
  },
  {
    groupId: "MEDT1980",
    teamName: "ByteForce",
    leaderName: "Varun Kulkarni",
    memberCount: 4,
    allocatedRole: "Technical Evaluator",
    status: "DECLINED",
    receivedDate: "07/30/2026",
    respondedDate: "07/31/2026",
  },
];
