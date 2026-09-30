"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { useMentorTeams } from "../mentor/MentorTeamsProvider";

export const MENTOR_ONBOARDING_KEY = "mentor_onboarding_completed";
export const REPLAY_MENTOR_ONBOARDING_EVENT = "prabodh:replay-mentor-onboarding";

export function readMentorOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MENTOR_ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markMentorOnboardingDone() {
  try {
    window.localStorage.setItem(MENTOR_ONBOARDING_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearMentorOnboarding() {
  try {
    window.localStorage.removeItem(MENTOR_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

export function replayMentorOnboarding() {
  window.dispatchEvent(new Event(REPLAY_MENTOR_ONBOARDING_EVENT));
}

/** First-time institute mentor walkthrough on the main assigned-groups dashboard. */
export function useMentorOnboarding() {
  const pathname = usePathname();
  const { session, ready } = useAuth();
  const { loading } = useMentorTeams();
  const [open, setOpen] = useState(false);

  const onMentorHome = pathname === "/dashboard/mentor";
  const isInstituteMentor = ready && session?.platformRole === "institute_mentor";
  const eligible = isInstituteMentor && onMentorHome && !loading;

  useEffect(() => {
    if (!eligible) return;
    if (readMentorOnboardingDone()) return;
    const id = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [eligible]);

  useEffect(() => {
    if (!eligible) setOpen(false);
  }, [eligible]);

  useEffect(() => {
    const onReplay = () => setOpen(true);
    window.addEventListener(REPLAY_MENTOR_ONBOARDING_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_MENTOR_ONBOARDING_EVENT, onReplay);
  }, []);

  const finish = useCallback(() => {
    markMentorOnboardingDone();
    setOpen(false);
  }, []);

  return { open, finish };
}
