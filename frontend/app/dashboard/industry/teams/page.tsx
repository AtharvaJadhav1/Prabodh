"use client";

import IndustryShell from "../../../../components/industry/IndustryShell";
import AssignedTeamsTable from "../../../../components/industry/AssignedTeamsTable";
import { ErrorBanner, SkeletonRows } from "../../../../components/industry/LoadState";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryTeamsPage() {
  const { visibleTeams, allTeams, teamMentors, selectedMentorIds, isLoading, error, reload } = useIndustryMentor();

  return (
    <IndustryShell title="Assigned Teams">
      <div className="mx-auto max-w-7xl">
        {error ? <ErrorBanner className="mb-4" message={error} onRetry={() => void reload()} /> : null}
        <p className="mb-4 text-xs font-medium text-brand-muted">
          {selectedMentorIds.length > 0
            ? `Showing teams from ${selectedMentorIds.length} selected mentor(s).`
            : "Showing teams from all accepted mentors."}
        </p>
        {isLoading ? (
          <SkeletonRows rows={4} label="Loading assigned teams…" />
        ) : (
          <AssignedTeamsTable groups={visibleTeams} totalTeams={allTeams.length} teamMentors={teamMentors} />
        )}
      </div>
    </IndustryShell>
  );
}
