import type { Metadata } from "next";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import MentorInvitePanel from "../../../../components/dashboard/MentorInvitePanel";

export const metadata: Metadata = {
  title: "Prabodh | Assigned Mentors",
  description: "Review your institute mentor and industry mentor assignment.",
};

export default function MentorsPage() {
  return (
<DashboardShell title="Assigned Mentors">
      <div className="mx-auto max-w-4xl">
        <MentorInvitePanel />
      </div>
    </DashboardShell>
  );
}