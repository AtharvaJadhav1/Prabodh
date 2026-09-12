import type { Metadata } from "next";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import MentorInvitePanel from "../../../../components/dashboard/MentorInvitePanel";
import LiveTeamName from "../../../../components/dashboard/LiveTeamName";

export const metadata: Metadata = {
  title: "Assigned Mentors | SIH 2026",
  description: "Review your institute mentor and industry mentor assignment.",
};

export default function MentorsPage() {
  return (
    <DashboardShell
      title="Assigned Mentors"
      subtitle={
        <>
          Faculty mentor track • <LiveTeamName />
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        <MentorInvitePanel />
      </div>
    </DashboardShell>
  );
}