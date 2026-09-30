export type RubricCriterion = { id?: string; label: string; maxScore: number };

export type StageConfig = {
  id: string;
  name: string;
  order: number;
  rubricCriteria: RubricCriterion[];
  status: "upcoming" | "active" | "closed";
};

export type AdminAllocation = {
  teamId: string;
  teamName: string;
  track: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  assignedIndustryMentorId: string | null;
  assignedIndustryMentorName: string | null;
  assignedMentorAssignmentId: string | null;
  assignedIndustryMentorAssignmentId: string | null;
  status: "unassigned" | "assigned";
};

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
