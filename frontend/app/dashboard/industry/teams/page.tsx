"use client";

import IndustryShell from "../../../../components/industry/IndustryShell";
import AssignedTeamsTable from "../../../../components/industry/AssignedTeamsTable";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryTeamsPage() {
  const { visibleTeams, teamMentors, selectedMentorIds } = useIndustryMentor();

  return (
    <IndustryShell title="Assigned Teams">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-xs font-medium text-brand-muted">
          {selectedMentorIds.length > 0
            ? `Showing teams from ${selectedMentorIds.length} selected mentor(s).`
            : "Showing teams from all accepted mentors."}
        </p>
        <AssignedTeamsTable groups={visibleTeams} teamMentors={teamMentors} />
      </div>
    </IndustryShell>
  );
}
