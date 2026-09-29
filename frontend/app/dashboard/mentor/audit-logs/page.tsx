"use client";

import { useMemo } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import AuditLogView from "../../../../components/audit/AuditLogView";
import { useMentorTeams } from "../../../../components/mentor/MentorTeamsProvider";

export default function MentorAuditLogsPage() {
  const { teams } = useMentorTeams();
  const teamOptions = useMemo(
    () =>
      teams
        .filter((t) => !t.pendingInvite)
        .map((t) => ({ value: t.team.id, label: `${t.team.name} (${t.team.teamCode})` })),
    [teams],
  );

  return (
    <MentorShell title="Audit Logs">
      <p className="mx-auto mb-4 max-w-7xl text-xs font-medium text-brand-muted">
        Activity recorded for the teams you mentor.
      </p>
      <AuditLogView endpoint="/mentors/me/audit-log" teamOptions={teamOptions} csvName="team_audit_logs.csv" />
    </MentorShell>
  );
}
