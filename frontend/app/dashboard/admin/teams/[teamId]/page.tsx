"use client";

import { useParams } from "next/navigation";
import AdminShell from "../../../../../components/admin/AdminShell";
import TeamDetailsView from "../../../../../components/teams/TeamDetailsView";

export default function AdminTeamDetailPage() {
  const params = useParams<{ teamId: string }>();

  return (
    <AdminShell title="Team Details">
      <TeamDetailsView teamId={params.teamId} audience="admin" backHref="/dashboard/admin/teams" />
    </AdminShell>
  );
}
