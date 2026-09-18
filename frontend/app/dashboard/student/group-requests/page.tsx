import type { Metadata } from "next";
import HeaderZone from "../../../../components/dashboard/HeaderZone";
import {
  MultidisciplinaryCard,
  MentorInvitePointer,
} from "../../../../components/dashboard/GroupRequestsSide";
import LeaderNote from "../../../../components/dashboard/LeaderNote";
import DispatchInviteCard from "../../../../components/dashboard/DispatchInviteCard";
import RequestsTabs from "../../../../components/dashboard/RequestsTabs";
import IncomingInvitesCard from "../../../../components/dashboard/IncomingInvitesCard";

export const metadata: Metadata = {
  title: "Team Formation & Group Requests",
  description: "Manage team roster, review incoming join requests, and maintain SIH compliance.",
};

export default function GroupRequestsPage() {
  return (
    <>
      <HeaderZone />

      <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <IncomingInvitesCard />
          <DispatchInviteCard />
          <MentorInvitePointer />
          <MultidisciplinaryCard />
          <LeaderNote />
        </div>
        <div className="xl:col-span-8">
          <RequestsTabs />
        </div>
      </div>
    </>
  );
}
