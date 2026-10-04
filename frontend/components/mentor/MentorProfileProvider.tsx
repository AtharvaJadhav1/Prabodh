"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  mentorProfile as initialMentorProfile,
  type MentorProfile,
  type MentorCohort,
  type MentorExpertise,
  type MentorTrackRecordEntry,
} from "../../data/mentorDashboard";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { apiPatch } from "../../lib/api";
import { useMentorTeams } from "./MentorTeamsProvider";

export type MentorEditSection = "basic" | "socials" | "overview" | "expertise" | "record";

type SavedMentorProfile = {
  designation?: string;
  roleBadge?: string;
  location?: string;
  socials?: MentorProfile["socials"];
  nextAction?: string;
  cohorts?: MentorCohort[];
  domainExpertise?: MentorExpertise[];
  trackRecord?: MentorTrackRecordEntry[];
};

type MentorProfileContextValue = {
  profile: MentorProfile;
  saving: boolean;
  drawerOpen: boolean;
  section: MentorEditSection;
  openDrawer: (section?: MentorEditSection) => void;
  closeDrawer: () => void;
  saveProfile: (next: MentorProfile) => Promise<void>;
};

const MentorProfileContext = createContext<MentorProfileContextValue | null>(null);

export function MentorProfileProvider({ children }: { children: ReactNode }) {
  const { session, refreshMe } = useAuth();
  const { teams } = useMentorTeams();
  const [profile, setProfile] = useState<MentorProfile>(initialMentorProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<MentorEditSection>("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    const saved = (session.profileJson ?? {}) as SavedMentorProfile;
    setProfile((prev) => ({
      ...prev,
      initials: initialsFrom(session.fullName),
      fullName: session.fullName,
      email: session.email,
      department: session.department ?? prev.department,
      designation: saved.designation ?? prev.designation,
      roleBadge: saved.roleBadge ?? prev.roleBadge,
      location: saved.location ?? prev.location,
      socials: saved.socials ?? prev.socials,
      nextAction: saved.nextAction ?? prev.nextAction,
      domainExpertise: saved.domainExpertise ?? prev.domainExpertise,
      trackRecord: saved.trackRecord ?? prev.trackRecord,
      facultyId: session.userId,
    }));
  }, [session]);

  // Stats and cohorts are facts about the teams you actually mentor, so they are computed from them
  // rather than typed in or saved (they used to be stuck at 0 / whatever was typed last).
  const liveProfile = useMemo<MentorProfile>(() => {
    const assigned = teams.filter((row) => !row.pendingInvite);
    const awaitingDecision = assigned.filter(
      (row) => !row.team.problemStatement && (row.team.psPreferences ?? []).some((p) => p.status === "submitted"),
    ).length;
    const themes = new Set(assigned.map((row) => (row.team.theme ?? "").trim()).filter(Boolean));
    const cohorts: MentorCohort[] = assigned.map((row) => ({
      teamName: row.team.name,
      problemCode: row.team.problemStatement?.code ?? "—",
      domain: row.team.theme ?? "Unassigned",
      status: row.team.problemStatement ? "approved" : "pending",
      members: row.team.members?.length ?? 0,
    }));
    return {
      ...profile,
      stats: {
        ...profile.stats,
        assignedTeams: assigned.length,
        pendingReviews: awaitingDecision,
        reviewsLabel: "PS approvals pending",
        studentsGuided: cohorts.reduce((n, c) => n + c.members, 0),
        tracksCount: themes.size,
      },
      cohorts,
    };
  }, [profile, teams]);

  const openDrawer = (nextSection: MentorEditSection = "basic") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const saveProfile: MentorProfileContextValue["saveProfile"] = async (next) => {
    setSaving(true);
    try {
      await apiPatch("/me", {
        fullName: next.fullName,
        department: next.department,
        profileJson: {
          designation: next.designation,
          roleBadge: next.roleBadge,
          location: next.location,
          socials: next.socials,
          nextAction: next.nextAction,
          domainExpertise: next.domainExpertise,
          trackRecord: next.trackRecord,
        },
      });
      setProfile(next);
      await refreshMe();
    } finally {
      setSaving(false);
    }
  };

  return (
    <MentorProfileContext.Provider
      value={{
        profile: liveProfile,
        saving,
        drawerOpen,
        section,
        openDrawer,
        closeDrawer,
        saveProfile,
      }}
    >
      {children}
    </MentorProfileContext.Provider>
  );
}

export function useMentorProfile() {
  const ctx = useContext(MentorProfileContext);
  if (!ctx) throw new Error("useMentorProfile must be used within MentorProfileProvider");
  return ctx;
}
