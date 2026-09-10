export const student = {
  name: "Aarav Agarwal",
  initials: "AA",
  role: "Team Lead",
  prn: "MITU22BTCS0412",
  branch: "3rd Year B.Tech Computer Science & Engg.",
  email: "aarav.a@mituniversity.edu.in",
};

export const STUDENT_ROLE_KEY = "sih-student-role";

export type StudentRole = "Team Lead" | "Team Member";

export const studentRoles: { name: StudentRole; desc: string }[] = [
  {
    name: "Team Lead",
    desc: "Authority to select PS, invite mentors, and manage group requests.",
  },
  {
    name: "Team Member",
    desc: "Read-only access to team, PS, and mentor actions; can still edit your own profile.",
  },
];

export const team = {
  name: "Nex-Aura",
  id: "SIH-2026-482",
  branch: "B.Tech CSE & IT Dual Wing",
  capacity: 6,
  quotaLabel: "4 of 6 Members Finalized",
  femaleIncluded: true,
};

export type Member = {
  name: string;
  initials: string;
  prn: string;
  branch: string;
  role: "Leader" | "Member" | null;
  status: "Verified" | "Invite Pending" | "Empty";
  female?: boolean;
  inviteEmail?: string;
};

export const initialMembers: Member[] = [
  {
    name: "Aarav Agarwal",
    initials: "AA",
    prn: "MITU22BTCS0412",
    branch: "3rd Year B.Tech Computer Science & Engg.",
    role: "Leader",
    status: "Verified",
  },
  {
    name: "Priya Sharma",
    initials: "PS",
    prn: "MITU22BTIT0189",
    branch: "3rd Year Information Technology",
    role: "Member",
    status: "Verified",
    female: true,
  },
  {
    name: "Rohan Kulkarni",
    initials: "RK",
    prn: "MITU22BTAI0054",
    branch: "3rd Year AI & Data Science",
    role: "Member",
    status: "Verified",
  },
  {
    name: "Sneha Nair",
    initials: "SN",
    prn: "MITU22BTCS0821",
    branch: "3rd Year B.Tech Computer Science & Engg.",
    role: "Member",
    status: "Verified",
  },
  {
    name: "Open Slot 5",
    initials: "?",
    prn: "tanmay.d@mituniversity.edu.in",
    branch: "",
    role: null,
    status: "Invite Pending",
    inviteEmail: "tanmay.d@mituniversity.edu.in",
  },
  {
    name: "Open Slot 6 — Awaiting Member",
    initials: "?",
    prn: "",
    branch: "",
    role: null,
    status: "Empty",
  },
];

export type OutgoingInvite = {
  email: string;
  sentAt: string;
  status: string;
};

export const initialInvites: OutgoingInvite[] = [
  {
    email: "tanmay.d@mituniversity.edu.in",
    sentAt: "Sep 10, 2026 • 14:15 IST",
    status: "Invitation Sent — Awaiting Student Accept",
  },
];

export type JoinRequest = {
  initials: string;
  name: string;
  prn: string;
  branch: string;
  cgpa: string;
  skills: string[];
  note: string;
  requestedAt: string;
  avatarClass: string;
};

export const initialRequests: JoinRequest[] = [
  {
    initials: "KD",
    name: "Kunal Deshmukh",
    prn: "MITU22BTCS0551",
    branch: "B.Tech CSE - AI & Analytics",
    cgpa: "9.12",
    skills: ["FastAPI", "PyTorch", "Docker", "Financial APIs"],
    note: "Experienced with Python/FastAPI microservices and algorithmic order routing. Excited to contribute to Problem Statement FR-08 (Quant Trading Platform).",
    requestedAt: "today at 11:30 IST",
    avatarClass: "bg-brand-deep text-brand-cream",
  },
  {
    initials: "VT",
    name: "Vikas Tiwari",
    prn: "MITU22BTIT0310",
    branch: "B.Tech IT - Cloud Architecture",
    cgpa: "8.84",
    skills: ["React", "Next.js", "Tailwind CSS", "WebSockets"],
    note: "Built real-time websockets backends using Next.js & Redis. Looking to lead deployment infrastructure and AWS integrations.",
    requestedAt: "Sep 09 • 19:40 IST",
    avatarClass: "bg-brand-amber text-brand-deep",
  },
];

export const facultyMentor = {
  initials: "RK",
  name: "Dr. Ranjana Kale",
  designation: "Lead Faculty Mentor",
  nameLabel: "Associate Professor, Dept. of Information Technology",
  empId: "MIT-FAC-7814",
  email: "ranjana.kale@mituniversity.edu.in",
};

export const deliverables = [
  {
    title: "Problem Abstract (PDF)",
    fileName: "Abstract_NexAura_FR08_v1.2.pdf (1.8 MB) • Saved today at 14:20",
    status: "Uploaded",
    statusTone: "approved",
    tile: "file",
    actions: "view-replace",
  },
  {
    title: "Presentation Deck (PPT / PDF)",
    fileName: "SIH2026_PitchDeck_InternalRound.pptx (8.4 MB)",
    status: "Needs Update",
    statusTone: "pending",
    tile: "presentation",
    actions: "upload-new",
  },
  {
    title: "Repository / Prototype Link",
    fileName: "https://github.com/nex-aura/sih2026-quant-trader",
    status: "",
    statusTone: "",
    tile: "github",
    actions: "edit-url",
  },
];

export const problemStatement = {
  code: "FR-08",
  track: "SIH National Track",
  status: "APPROVED / LOCKED",
  title: "Conversational AI-Powered Quantitative Trading Platform",
  meta: [
    { label: "Category", value: "Software", tone: "text-brand-primary" },
    { label: "Domain", value: "FinTech", tone: "text-brand-approved" },
    { label: "Org", value: "Ministry / AICTE", tone: "text-brand-amber" },
  ],
  preview:
    "Develop an algorithmic portfolio management system utilizing generative LLMs for natural language financial analytics, automated backtesting against live NSE/BSE feeds, and predictive algorithmic hedging with strict multi-layer risk controls.",
  full: [
    {
      title: "Technical Scope",
      body: "Real-time streaming WebSocket ingestion, custom vector store embeddings for financial reports, sub-millisecond strategy execution, and automated regulatory reporting compliance under SEBI sandboxing criteria.",
    },
    {
      title: "Expected Output",
      body: "Working high-frequency simulation terminal, natural language strategy prompt compiler, and multi-tenant student-managed portfolios.",
    },
  ],
};

export const mentors = {
  institute: {
    initials: "RK",
    tag: "Institute Mentor",
    confirmed: true,
    name: "Dr. Ranjana Kale",
    dept: "Department of Computer Science & Engineering",
    nextReview: "Fri, Sep 12 • 15:30 IST",
  },
};

export const lockDate = "September 15, 23:59 IST";

export type SiFolder = {
  id: string;
  title: string;
  count: number;
  filterDomain: string;
};

export type SiStatement = {
  code: string;
  ministry: string;
  category: string;
  domain: string;
  title: string;
  description: string;
  postedBy: string;
  updatedAgo: string;
};

export type ManualFormDefaults = {
  title: string;
  track: string;
  domainFit: string;
  methodology: string;
  techStack: string[];
};

export const siFolders: SiFolder[] = [
  { id: "ai", title: "AI Problem Statements For TY & LY", count: 74, filterDomain: "AI" },
  { id: "govt", title: "SIH Central Govt. PS 2026", count: 380, filterDomain: "Govt" },
  { id: "startup", title: "Startup India & MSME PS", count: 24, filterDomain: "Startup" },
  { id: "cloud", title: "Industry Cloud & Edge Projects", count: 32, filterDomain: "Cloud" },
];

export const siStatements: SiStatement[] = [
  {
    code: "PS-SIH26-1049",
    ministry: "Ministry of Agriculture",
    category: "Software",
    domain: "AgriTech",
    title: "Crop Yield Prediction & Soil Nutrient Analysis",
    description:
      "Deep-learning model utilizing satellite multi-spectral imagery, local weather telemetry, and historical NPK ratios to recommend optimal crop rotation and predict yields with 92%+ confidence intervals.",
    postedBy: "Prof. Santosh Rathod",
    updatedAgo: "3 days ago",
  },
  {
    code: "PS-SIH26-1082",
    ministry: "State Agriculture Commission",
    category: "Hardware / IoT",
    domain: "AgriTech & Drones",
    title: "Grape Leaf Disease Detection & Autonomous Drone Spraying",
    description:
      "Edge-computing camera vision modules mounted on battery-swappable UAVs capable of micro-targeted pesticide dispersion only on identified mildew outbreaks across hilly vineyards.",
    postedBy: "Prof. Santosh Rathod",
    updatedAgo: "1 week ago",
  },
];

export const manualFormDefaults: ManualFormDefaults = {
  title: "Conversational AI-Powered Quantitative Trading Platform",
  track: "Software / Cloud AI",
  domainFit: "FinTech, Algorithmic Risk, Natural Language Interfaces",
  methodology:
    "Multi-agent LangChain / AutoGen framework integrated with vector market embeddings and zero-knowledge telemetry audits for institutional grade risk reconciliation.",
  techStack: ["Python 3.12", "PyTorch", "FastAPI", "DuckDB", "Docker", "Apache Kafka"],
};

