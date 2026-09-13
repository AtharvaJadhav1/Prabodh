"use client";

import MentorShell from "../../../../components/mentor/MentorShell";
import { MentorProfileProvider } from "../../../../components/mentor/MentorProfileProvider";
import MentorProfileHeaderCard from "../../../../components/mentor/MentorProfileHeaderCard";
import MentorProfileTabs from "../../../../components/mentor/MentorProfileTabs";
import MentorProfileEditDrawer from "../../../../components/mentor/MentorProfileEditDrawer";

export default function MentorProfilePage() {
  return (
    <MentorProfileProvider>
      <MentorShell title="Faculty Mentor Profile">
        <div className="mx-auto max-w-7xl space-y-6">
          <MentorProfileHeaderCard />
          <MentorProfileTabs />
        </div>
      </MentorShell>
      <MentorProfileEditDrawer />
    </MentorProfileProvider>
  );
}
