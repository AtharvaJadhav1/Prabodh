export const admin = {
  name: "",
  initials: "",
  title: "Platform administrator",
  empId: "",
  role: "Administrator",
};

export type Broadcast = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "institute-mentors" | "industry-mentors";
  sentAt: string;
  sentBy: string;
};

export const audienceLabels: Record<Broadcast["audience"], string> = {
  all: "Everyone",
  students: "Students",
  "institute-mentors": "Institute Mentors",
  "industry-mentors": "Industry Mentors",
};

export const initialBroadcasts: Broadcast[] = [];

export type RubricCriterion = { id?: string; label: string; maxScore: number };

export type StageConfig = {
  id: string;
  name: string;
  order: number;
  deadline: string;
  rubricCriteria: RubricCriterion[];
  status: "upcoming" | "active" | "closed";
};

export const initialStageConfigs: StageConfig[] = [];

export type AdminAllocation = {
  teamId: string;
  teamName: string;
  track: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  assignedIndustryMentorId: string | null;
  assignedIndustryMentorName: string | null;
  status: "unassigned" | "assigned";
};

export const initialAllocations: AdminAllocation[] = [];

export const availableMentors: Array<{ id: string; name: string; title: string }> = [];

export function platformMetrics() {
  return {
    totalTeams: 0,
    totalStudents: 0,
    totalInstituteMentors: 0,
    totalIndustryMentors: 0,
    pendingAllocations: 0,
    activeStage: "—",
  };
}

export const tracks = ["All Tracks", "Software", "Hardware", "AI", "FinTech", "AgriTech"];

export { allGroups, mentorProfile, initialIndustryMentors } from "./mentorDashboard";
