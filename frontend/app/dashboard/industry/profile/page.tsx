"use client";

import DangerZoneDeleteAccount from "../../../../components/account/DangerZoneDeleteAccount";
import IndustryShell from "../../../../components/industry/IndustryShell";
import { IndustryProfileProvider } from "../../../../components/industry/IndustryProfileProvider";
import IndustryProfileHeaderCard from "../../../../components/industry/IndustryProfileHeaderCard";
import IndustryProfileTabs from "../../../../components/industry/IndustryProfileTabs";
import IndustryProfileEditDrawer from "../../../../components/industry/IndustryProfileEditDrawer";

export default function IndustryProfilePage() {
  return (
    <IndustryProfileProvider>
      <IndustryShell title="Industry Mentor Profile">
        <div className="mx-auto max-w-7xl space-y-6">
          <IndustryProfileHeaderCard />
          <IndustryProfileTabs />
          <DangerZoneDeleteAccount />
        </div>
      </IndustryShell>
      <IndustryProfileEditDrawer />
    </IndustryProfileProvider>
  );
}