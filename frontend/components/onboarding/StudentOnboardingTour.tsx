"use client";

import SpotlightTour, { type SpotlightTourStep } from "./SpotlightTour";
import { useStudentOnboarding } from "./useStudentOnboarding";

const STEPS: SpotlightTourStep[] = [
  {
    targetId: "tour-create-team",
    title: "Want to Lead a Team?",
    body: (
      <>
        Clicking here makes you the <strong className="font-bold text-brand-deep">Team Leader</strong>. You will
        configure your project domain, manage team members, send invitations, and handle final submissions.
      </>
    ),
    cta: "Next",
  },
  {
    targetId: "tour-join-team",
    title: "Already have a Team Leader?",
    body: (
      <>
        If your friend or teammate already created the team,{" "}
        <strong className="font-bold text-brand-deep">do not create a new one</strong>. Wait for your leader&apos;s
        invitation or accept your pending team invite right here.
      </>
    ),
    cta: "Got it, let’s start!",
  },
];

export default function StudentOnboardingTour() {
  const { open, finish } = useStudentOnboarding();
  return (
    <SpotlightTour open={open} finish={finish} steps={STEPS} presentationKey="student-onboarding-tour" />
  );
}
