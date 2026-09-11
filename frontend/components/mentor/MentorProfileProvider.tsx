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

type MentorProfileContextValue = {
  profile: MentorProfile;
  drawerOpen: boolean;
  section: MentorEditSection;
  openDrawer: (section?: MentorEditSection) => void;
  closeDrawer: () => void;
  updateBasicInfo: (
    updates: Partial<
      Pick<MentorProfile, "fullName" | "designation" | "department" | "email" | "location" | "roleBadge">
    >
  ) => void;
  setSocials: (socials: MentorProfile["socials"]) => void;
  setNextAction: (nextAction: string) => void;
  setCohorts: (cohorts: MentorCohort[]) => void;
  setDomainExpertise: (expertise: MentorExpertise[]) => void;
  setTrackRecord: (trackRecord: MentorTrackRecordEntry[]) => void;
};

const MentorProfileContext = createContext<MentorProfileContextValue | null>(null);

export function MentorProfileProvider({ children }: { children: ReactNode }) {
  const { session, refreshMe } = useAuth();
  const [profile, setProfile] = useState<MentorProfile>(initialMentorProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<MentorEditSection>("basic");

  useEffect(() => {
    if (!session) return;
    setProfile((prev) => ({
      ...prev,
      initials: initialsFrom(session.fullName),
      fullName: session.fullName,
      email: session.email,
      department: session.department ?? prev.department,
      designation: session.department ?? prev.designation,
      facultyId: session.userId,
      location: session.institute ?? prev.location,
    }));
  }, [session]);

  const openDrawer = (nextSection: MentorEditSection = "basic") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const updateBasicInfo: MentorProfileContextValue["updateBasicInfo"] = (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    void apiPatch("/me", {
      fullName: updates.fullName,
      department: updates.department,
      institute: updates.location,
    }).then(() => refreshMe());
  };

  return (
    <MentorProfileContext.Provider
      value={{
        profile,
        drawerOpen,
        section,
        openDrawer,
        closeDrawer,
        updateBasicInfo,
        setSocials: (socials) => setProfile((prev) => ({ ...prev, socials })),
        setNextAction: (nextAction) => setProfile((prev) => ({ ...prev, nextAction })),
        setCohorts: (cohorts) => setProfile((prev) => ({ ...prev, cohorts })),
        setDomainExpertise: (domainExpertise) => setProfile((prev) => ({ ...prev, domainExpertise })),
        setTrackRecord: (trackRecord) => setProfile((prev) => ({ ...prev, trackRecord })),
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
