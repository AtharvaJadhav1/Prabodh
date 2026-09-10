import type { Metadata } from "next";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import LockedBanner from "../../../../components/dashboard/ps/LockedBanner";
import FinalizedPSDetail from "../../../../components/dashboard/ps/FinalizedPSDetail";
import ProblemStatementTabs from "../../../../components/dashboard/ps/ProblemStatementTabs";

export const metadata: Metadata = {
  title: "Problem Statement Selection | SIH 2026",
  description:
    "Browse official SIH 2026 problem statements or submit a student innovation idea. After PS finalization this page is read-only per SIH data-integrity policy.",
};

export default function ProblemStatementsPage() {
  return (
    <DashboardShell
      title="Problem Statement Selection"
      subtitle="Locked post-finalization — SIH data-integrity policy prohibits silent overwrite"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <LockedBanner />
        <FinalizedPSDetail />
        <ProblemStatementTabs />
      </div>
    </DashboardShell>
  );
}
