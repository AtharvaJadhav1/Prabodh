import type { Metadata } from "next";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import MentorInvitePanel from "../../../../components/dashboard/MentorInvitePanel";

export const metadata: Metadata = {
  title: "Assigned Mentors | SIH 2026",
  description:
    "Review your institute mentor and send an industry mentor invite for Team Nex-Aura.",
};

export default function MentorsPage() {
  return (
    <DashboardShell
      title="Assigned Mentors"
      subtitle={<>Dual mentorship track • <span className="font-semibold text-brand-charcoal">Team Nex-Aura</span></>}
    >
      <div className="mx-auto max-w-4xl">
        <MentorInvitePanel />
      </div>
    </DashboardShell>
  );
}