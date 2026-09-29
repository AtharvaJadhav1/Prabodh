"use client";

import { useMemo } from "react";
import IndustryShell from "../../../../components/industry/IndustryShell";
import AuditLogView from "../../../../components/audit/AuditLogView";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryAuditLogsPage() {
  const { allTeams } = useIndustryMentor();
  const teamOptions = useMemo(
    () =>
      allTeams
        .filter((t) => t.id)
        .map((t) => ({ value: t.id as string, label: `${t.teamName} (${t.teamId})` })),
    [allTeams],
  );

  return (
    <IndustryShell title="Audit Logs">
      <p className="mx-auto mb-4 max-w-7xl text-xs font-medium text-brand-muted">
        Activity recorded for the teams you mentor.
      </p>
      <AuditLogView endpoint="/mentors/me/audit-log" teamOptions={teamOptions} csvName="team_audit_logs.csv" />
    </IndustryShell>
  );
}
