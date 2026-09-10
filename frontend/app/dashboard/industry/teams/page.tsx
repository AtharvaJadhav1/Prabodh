"use client";

import IndustryShell from "../../../../components/industry/IndustryShell";
import AssignedTeamsTable from "../../../../components/industry/AssignedTeamsTable";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryTeamsPage() {
  const { visibleTeams, teamMentors, selectedMentorIds } = useIndustryMentor();

  return (
    <IndustryShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Industry Mentorship" }, { label: "Assigned Teams" }]}
      title="Assigned Teams"
      subtitle={
        selectedMentorIds.length > 0
          ? `Showing teams from ${selectedMentorIds.length} selected mentor(s).`
          : "Showing teams from all accepted mentors."
      }
      showActions={false}
    >
      <div className="mx-auto max-w-7xl">
        <AssignedTeamsTable groups={visibleTeams} teamMentors={teamMentors} />
      </div>
    </IndustryShell>
  );
}
