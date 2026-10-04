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

export type GroupRequest = {
  id: string;
  teamId: string;
  groupId: string;
  teamName: string;
  leaderName: string;
  leaderAvatarUrl?: string | null;
  memberCount: number;
  allocatedRole: string;
  allocatedAt: string;
  domains: string[];
};

export type GroupRequestHistoryEntry = {
  teamId: string;
  groupId: string;
  teamName: string;
  leaderName: string;
  leaderAvatarUrl?: string | null;
  memberCount: number;
  allocatedRole: string;
  status: "ACCEPTED" | "DECLINED" | "EXPIRED";
  receivedDate: string;
  respondedDate: string;
};

