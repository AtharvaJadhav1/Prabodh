import type { Metadata } from "next";
import DashboardShell from "../../../../components/dashboard/DashboardShell";
import HeaderZone from "../../../../components/dashboard/HeaderZone";
import {
  ComplianceCard,
  MentorInvitePointer,
} from "../../../../components/dashboard/GroupRequestsSide";
import LeaderNote from "../../../../components/dashboard/LeaderNote";
import DispatchInviteCard from "../../../../components/dashboard/DispatchInviteCard";
import RequestsTabs from "../../../../components/dashboard/RequestsTabs";

export const metadata: Metadata = {
  title: "Team Formation & Group Requests | SIH 2026",
  description:
    "Manage team roster, review incoming join requests, and maintain SIH compliance for Team Nex-Aura.",
};

export default function GroupRequestsPage() {
  return (
    <DashboardShell
      title="Team Formation & Group Requests"
      subtitle={<>College SPOC Verified Track • <span className="font-semibold text-brand-charcoal">Team Nex-Aura</span></>}
    >
      <HeaderZone />

      <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <DispatchInviteCard />
          <MentorInvitePointer />
          <ComplianceCard />
          <LeaderNote />
        </div>
        <div className="xl:col-span-8">
          <RequestsTabs />
        </div>
      </div>
    </DashboardShell>
  );
}