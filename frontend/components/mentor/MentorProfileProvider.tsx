"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  mentorProfile as initialMentorProfile,
  type MentorProfile,
  type MentorCohort,
  type MentorExpertise,
  type MentorTrackRecordEntry,
} from "../../data/mentorDashboard";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { apiPatch } from "../../lib/api";

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
      cohorts: saved.cohorts ?? prev.cohorts,
      domainExpertise: saved.domainExpertise ?? prev.domainExpertise,
      trackRecord: saved.trackRecord ?? prev.trackRecord,
      facultyId: session.userId,
    }));
  }, [session]);

  const openDrawer = (nextSection: MentorEditSection = "basic") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const saveProfile: MentorProfileContextValue["saveProfile"] = async (next) => {
    setProfile(next);
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
          cohorts: next.cohorts,
          domainExpertise: next.domainExpertise,
          trackRecord: next.trackRecord,
        },
      });
      await refreshMe();
    } finally {
      setSaving(false);
    }
  };

  return (
    <MentorProfileContext.Provider
      value={{
        profile,
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
