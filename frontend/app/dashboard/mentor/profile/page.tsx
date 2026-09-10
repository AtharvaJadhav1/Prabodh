"use client";

import MentorShell from "../../../../components/mentor/MentorShell";
import { MentorProfileProvider } from "../../../../components/mentor/MentorProfileProvider";
import MentorProfileHeaderCard from "../../../../components/mentor/MentorProfileHeaderCard";
import MentorProfileTabs from "../../../../components/mentor/MentorProfileTabs";
import MentorProfileEditDrawer from "../../../../components/mentor/MentorProfileEditDrawer";

export default function MentorProfilePage() {
  return (
    <MentorProfileProvider>
      <MentorShell
        breadcrumb={[
          { label: "SIH 2026 Portal" },
          { label: "Faculty Profile" },
        ]}
        title="Faculty Mentor Profile"
        subtitle="View and manage your institutional mentoring profile, domain expertise, and track record."
        showActions={false}
      >
        <div className="mx-auto max-w-7xl space-y-6">
          <MentorProfileHeaderCard />
          <MentorProfileTabs />
        </div>
      </MentorShell>
      <MentorProfileEditDrawer />
    </MentorProfileProvider>
  );
}
