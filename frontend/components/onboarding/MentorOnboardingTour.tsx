"use client";

import SpotlightTour, { type SpotlightTourStep } from "./SpotlightTour";
import { useMentorOnboarding } from "./useMentorOnboarding";

const STEPS: SpotlightTourStep[] = [
  {
    targetId: "tour-mentor-metrics",
    title: "Your mentorship overview",
    body: (
      <>
        See how many <strong className="font-bold text-brand-deep">teams</strong> and{" "}
        <strong className="font-bold text-brand-deep">students</strong> you guide at a glance. Counts update as
        students invite you or an admin assigns teams.
      </>
    ),
    cta: "Next",
  },
  {
    targetId: "tour-mentor-filters",
    title: "Find a team quickly",
    body: (
      <>
        Search by team name, leader email, or problem topic. Use the track filter to narrow large cohorts during the
        qualifier.
      </>
    ),
    cta: "Next",
  },
  {
    targetId: "tour-mentor-nav",
    title: "Where to work next",
    body: (
      <>
        Use the sidebar for <strong className="font-bold text-brand-deep">Group Requests</strong> (student invites),{" "}
        <strong className="font-bold text-brand-deep">PS Approvals</strong>, and{" "}
        <strong className="font-bold text-brand-deep">Team Queries</strong>. On mobile, tap the menu icon to open it.
        Open any team card below to review members, deliverables, and preferences.
      </>
    ),
    cta: "Got it, let’s mentor!",
  },
];

export default function MentorOnboardingTour() {
  const { open, finish } = useMentorOnboarding();
  return (
    <SpotlightTour open={open} finish={finish} steps={STEPS} presentationKey="mentor-onboarding-tour" />
  );
}
