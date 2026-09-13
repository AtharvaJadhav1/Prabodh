import type { Metadata } from "next";
import LockedBanner from "../../../../components/dashboard/ps/LockedBanner";
import FinalizedPSDetail from "../../../../components/dashboard/ps/FinalizedPSDetail";
import ProblemStatementTabs from "../../../../components/dashboard/ps/ProblemStatementTabs";

export const metadata: Metadata = {
  title: "Problem Statement Selection",
  description:
    "Browse official SIH 2026 problem statements or submit a student innovation idea. After PS finalization this page is read-only per SIH data-integrity policy.",
};

export default function ProblemStatementsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <LockedBanner />
      <FinalizedPSDetail />
      <ProblemStatementTabs />
    </div>
  );
}
