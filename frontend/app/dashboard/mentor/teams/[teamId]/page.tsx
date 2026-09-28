"use client";

import { useParams } from "next/navigation";
import MentorShell from "../../../../../components/mentor/MentorShell";
import TeamDetailsView from "../../../../../components/teams/TeamDetailsView";

export default function MentorTeamDetailPage() {
  const params = useParams<{ teamId: string }>();

  return (
    <MentorShell title="Team Detail">
      <TeamDetailsView teamId={params.teamId} audience="mentor" backHref="/dashboard/mentor/teams" />
    </MentorShell>
  );
}
