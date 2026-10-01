import type { Metadata } from "next";
import TeamWorkspaceCard from "../../../components/dashboard/TeamWorkspaceCard";
import DeliverablesCard from "../../../components/dashboard/DeliverablesCard";
import ProblemStatementCard from "../../../components/dashboard/ProblemStatementCard";
import MentorsCard from "../../../components/dashboard/MentorsCard";
import QualifierCard from "../../../components/dashboard/QualifierCard";
import TeamCommentsCard from "../../../components/dashboard/TeamCommentsCard";
import StudentOnboardingTour from "../../../components/onboarding/StudentOnboardingTour";

export const metadata: Metadata = {
  title: "Team Workspace",
  description:
    "Team workspace, deliverables, problem statement, mentors, and group requests for SIH 2026 internal qualifier.",
};

export default function StudentDashboardPage() {
  return (
    <>
      <StudentOnboardingTour />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <TeamWorkspaceCard />
          <DeliverablesCard />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <ProblemStatementCard />
          <MentorsCard />
          {/* On mobile the discussion is a separate page reached from the menu. */}
          <div className="hidden lg:block">
            <TeamCommentsCard />
          </div>
          <QualifierCard />
        </div>
      </div>
    </>
  );
}
