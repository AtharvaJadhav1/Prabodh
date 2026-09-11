export const mentor = {
  name: "",
  initials: "",
  title: "",
  empId: "",
  role: "Institute Evaluator",
};

export type MentorGroup = {
  id?: string;
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

export const pendingGroups: MentorGroup[] = [];
export const evaluatedGroups: MentorGroup[] = [];
export const allGroups: MentorGroup[] = [];

export const tracks = ["All Tracks", "Software", "Hardware", "AI", "FinTech", "AgriTech"];

export const metrics = {
  assignedTeams: 0,
  totalStudents: 0,
  pendingReviews: 0,
  milestoneDate: "—",
  daysLeft: 0,
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
  "AgriTech",
  "Cloud",
  "IoT",
];

export const initialIndustryMentors: IndustryMentor[] = [];

export type MentorCohort = {
  teamName: string;
  problemCode: string;
  domain: string;
  status: string;
  members: number;
};

export type MentorExpertise = {
  area: string;
  focusLevel: string;
  details: string;
};

export type MentorTrackRecordEntry = {
  season: string;
  teamName: string;
  outcome: string;
  result: string;
};

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
  socials: Array<{ label: string; href: string }>;
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
  initials: "",
  fullName: "",
  verified: true,
  designation: "",
  department: "",
  facultyId: "",
  roleBadge: "Institute mentor",
  email: "",
  location: "",
  socials: [],
  stats: {
    assignedTeams: 0,
    teamsLabel: "Assigned teams",
    pendingReviews: 0,
    reviewsLabel: "Pending reviews",
    studentsGuided: 0,
    studentsLabel: "Students",
    tracksCount: 0,
  },
  nextAction: "",
  cohorts: [],
  domainExpertise: [],
  trackRecord: [],
};

export const mentorMaxCap = 5;

export type GroupRequest = {
  id: string;
  groupId: string;
  teamName: string;
  leaderName: string;
  memberCount: number;
  allocatedRole: string;
  allocatedAt: string;
  domains: string[];
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

export const initialPendingRequests: GroupRequest[] = [];
export const initialRequestHistory: GroupRequestHistoryEntry[] = [];
