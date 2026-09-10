import { allGroups, mentor, mentorProfile, initialIndustryMentors, tracks } from "./mentorDashboard";
import { initialMembers } from "./studentDashboard";

export const admin = {
  name: "Priya Deshpande",
  initials: "PD",
  title: "SIH Nodal Officer",
  empId: "MIT-ADM-0012",
  role: "Platform Administrator",
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

export const initialBroadcasts: Broadcast[] = [
  {
    id: "BC-001",
    title: "Stage 1 Submission Window Extended",
    message: "The Stage 1 architecture & PPT deadline has been extended by 48 hours due to portal maintenance.",
    audience: "all",
    sentAt: "Today, 08:00 AM",
    sentBy: admin.name,
  },
  {
    id: "BC-002",
    title: "Industry Mentor Onboarding Reminder",
    message: "Please complete your domain expertise profile before the Stage 1 review sync on Friday.",
    audience: "industry-mentors",
    sentAt: "Yesterday, 05:30 PM",
    sentBy: admin.name,
  },
];

export type RubricCriterion = { label: string; maxScore: number };

export type StageConfig = {
  id: string;
  name: string;
  order: number;
  deadline: string;
  rubricCriteria: RubricCriterion[];
  status: "upcoming" | "active" | "closed";
};

export const initialStageConfigs: StageConfig[] = [
  {
    id: "STAGE-1",
    name: "Stage 1 — Architecture & PPT",
    order: 1,
    deadline: "Sep 15, 2026 · 23:59 IST",
    rubricCriteria: [
      { label: "Problem Understanding", maxScore: 10 },
      { label: "Technical Feasibility", maxScore: 15 },
      { label: "Innovation & Novelty", maxScore: 10 },
    ],
    status: "active",
  },
  {
    id: "STAGE-2",
    name: "Stage 2 — Working Prototype",
    order: 2,
    deadline: "Oct 10, 2026 · 23:59 IST",
    rubricCriteria: [
      { label: "Prototype Completeness", maxScore: 20 },
      { label: "Scalability", maxScore: 10 },
    ],
    status: "upcoming",
  },
  {
    id: "STAGE-3",
    name: "Stage 3 — Grand Finale Pitch",
    order: 3,
    deadline: "Nov 5, 2026 · 23:59 IST",
    rubricCriteria: [{ label: "Final Presentation", maxScore: 25 }],
    status: "upcoming",
  },
];

export type AdminAllocation = {
  teamId: string;
  teamName: string;
  track: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  status: "unassigned" | "assigned";
};

export const initialAllocations: AdminAllocation[] = allGroups.map((g) => ({
  teamId: g.teamId,
  teamName: g.teamName,
  track: g.track,
  assignedMentorId: mentor.empId,
  assignedMentorName: mentor.name,
  status: "assigned" as const,
}));

export const availableMentors = [{ id: mentor.empId, name: mentor.name, title: mentor.title }];

export function platformMetrics() {
  return {
    totalTeams: allGroups.length,
    totalStudents: initialMembers.length,
    totalInstituteMentors: availableMentors.length,
    totalIndustryMentors: initialIndustryMentors.length,
    pendingAllocations: initialAllocations.filter((a) => a.status === "unassigned").length,
    activeStage: initialStageConfigs.find((s) => s.status === "active")?.name ?? "—",
  };
}

export { allGroups, mentorProfile, initialIndustryMentors, tracks };
