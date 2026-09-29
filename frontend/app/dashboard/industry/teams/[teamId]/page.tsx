"use client";

import { useParams } from "next/navigation";
import IndustryShell from "../../../../../components/industry/IndustryShell";
import TeamDetailsView from "../../../../../components/teams/TeamDetailsView";

export default function IndustryTeamDetailPage() {
  const params = useParams<{ teamId: string }>();

  return (
    <IndustryShell title="Team Details">
      <TeamDetailsView teamId={params.teamId} audience="industry" backHref="/dashboard/industry/teams" />
    </IndustryShell>
  );
}
