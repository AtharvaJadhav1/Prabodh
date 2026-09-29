"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useTeam } from "../dashboard/TeamProvider";

export const STUDENT_ONBOARDING_KEY = "student_onboarding_completed";
export const REPLAY_STUDENT_ONBOARDING_EVENT = "prabodh:replay-student-onboarding";

export function readStudentOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STUDENT_ONBOARDING_KEY) === "1";
  } catch {
    // Storage blocked — treat as done so we never nag on a locked-down browser.
    return true;
  }
}

export function markStudentOnboardingDone() {
  try {
    window.localStorage.setItem(STUDENT_ONBOARDING_KEY, "1");
  } catch {
    // Storage unavailable — the tour simply re-offers on the next visit.
  }
}

export function clearStudentOnboarding() {
  try {
    window.localStorage.removeItem(STUDENT_ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

/** Replay the walkthrough on demand (e.g. from a help menu or dev console). */
export function replayStudentOnboarding() {
  window.dispatchEvent(new Event(REPLAY_STUDENT_ONBOARDING_EVENT));
}

/**
 * Gating logic for the first-time student walkthrough.
 * Runs only for the student role, only while the student still has no team
 * (the exact state where the "lead vs join" choice matters), and only once.
 */
export function useStudentOnboarding() {
  const { session, ready } = useAuth();
  const { role, loading } = useTeam();
  const [open, setOpen] = useState(false);

  const isStudent = ready && session?.platformRole === "student";
  const eligible = isStudent && !loading && role === "NO_TEAM";

  useEffect(() => {
    if (!eligible) return;
    if (readStudentOnboardingDone()) return;
    // Small delay so the workspace card is painted and measurable.
    const id = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [eligible]);

  // The student joined/created a team mid-tour (or left the role) — stand down.
  useEffect(() => {
    if (!eligible) setOpen(false);
  }, [eligible]);

  useEffect(() => {
    const onReplay = () => setOpen(true);
    window.addEventListener(REPLAY_STUDENT_ONBOARDING_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_STUDENT_ONBOARDING_EVENT, onReplay);
  }, []);

  const finish = useCallback(() => {
    markStudentOnboardingDone();
    setOpen(false);
  }, []);

  return { open, finish };
}
