"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { MentorGroup } from "../../data/mentorDashboard";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { apiPatch } from "../../lib/api";
import { useIndustryMentor } from "./IndustryMentorProvider";

export type IndustryTrackRecordEntry = {
  teamName: string;
  problemCode: string;
  track: string;
  status: string;
  outcome: string;
};

export type IndustryEditSection = "profile" | "expertise";

export type IndustryProfile = {
  initials: string;
  fullName: string;
  email: string;
  company: string;
  designation: string;
  phone: string;
  location: string;
  industryMentorId: string;
  roleBadge: string;
  linkedinUrl: string;
  domainExpertise: string[];
  coreSkills: string[];
  experienceYears: string;
  trackRecord: IndustryTrackRecordEntry[];
};

export type IndustryStats = {
  assignedTeams: number;
  pendingCount: number;
  studentsGuided: number;
  cohorts: MentorGroup[];
};

type SavedIndustryProfile = {
  designation?: string;
  company?: string;
  roleBadge?: string;
  location?: string;
  linkedinUrl?: string;
  domainExpertise?: string[];
  coreSkills?: string[];
  experienceYears?: string;
  trackRecord?: IndustryTrackRecordEntry[];
};

type IndustryProfileContextValue = {
  profile: IndustryProfile;
  stats: IndustryStats;
  saving: boolean;
  drawerOpen: boolean;
  section: IndustryEditSection;
  openDrawer: (section?: IndustryEditSection) => void;
  closeDrawer: () => void;
  saveProfile: (next: IndustryProfile) => Promise<void>;
};

const IndustryProfileContext = createContext<IndustryProfileContextValue | null>(null);

const defaultProfile: IndustryProfile = {
  initials: "IM",
  fullName: "Industry Mentor",
  email: "",
  company: "",
  designation: "Industry Expert",
  phone: "",
  location: "",
  industryMentorId: "",
  roleBadge: "Industry Expert",
  linkedinUrl: "",
  domainExpertise: ["Cloud Systems", "AI/ML", "Embedded Systems", "FinTech"],
  coreSkills: [],
  experienceYears: "",
  trackRecord: [],
};

function studentsGuidedFrom(cohorts: MentorGroup[]): number {
  return cohorts.reduce((sum, cohort) => {
    const num = Number.parseInt(cohort.capacity.split("/")[0] ?? "0", 10);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
}

export function IndustryProfileProvider({ children }: { children: ReactNode }) {
  const { session, refreshMe } = useAuth();
  const { pendingInvites, visibleTeams } = useIndustryMentor();
  const [profile, setProfile] = useState<IndustryProfile>(defaultProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<IndustryEditSection>("profile");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    const saved = (session.profileJson ?? {}) as SavedIndustryProfile;
    setProfile((prev) => ({
      ...defaultProfile,
      ...prev,
      initials: initialsFrom(session.fullName),
      fullName: session.fullName,
      email: session.email,
      phone: session.phone ?? prev.phone,
      industryMentorId: session.userId,
      company: session.institute ?? saved.company ?? prev.company,
      designation: session.department ?? saved.designation ?? prev.designation,
      roleBadge: saved.roleBadge ?? "Industry Expert",
      location: saved.location ?? "",
      linkedinUrl: saved.linkedinUrl ?? "",
      domainExpertise: saved.domainExpertise ?? prev.domainExpertise,
      coreSkills: saved.coreSkills ?? [],
      experienceYears: saved.experienceYears ?? "",
      trackRecord: saved.trackRecord ?? [],
    }));
  }, [session]);

  const openDrawer = (nextSection: IndustryEditSection = "profile") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);

  const saveProfile: IndustryProfileContextValue["saveProfile"] = async (next) => {
    setProfile(next);
    setSaving(true);
    try {
      await apiPatch("/me", {
        fullName: next.fullName,
        institute: next.company,
        department: next.designation,
        phone: next.phone,
        profileJson: {
          designation: next.designation,
          company: next.company,
          roleBadge: next.roleBadge,
          location: next.location,
          linkedinUrl: next.linkedinUrl,
          domainExpertise: next.domainExpertise,
          coreSkills: next.coreSkills,
          experienceYears: next.experienceYears,
          trackRecord: next.trackRecord,
        },
      });
      await refreshMe();
    } finally {
      setSaving(false);
    }
  };

  const stats: IndustryStats = {
    assignedTeams: visibleTeams.length,
    pendingCount: pendingInvites.length,
    studentsGuided: studentsGuidedFrom(visibleTeams),
    cohorts: visibleTeams,
  };

  return (
    <IndustryProfileContext.Provider
      value={{ profile, stats, saving, drawerOpen, section, openDrawer, closeDrawer, saveProfile }}
    >
      {children}
    </IndustryProfileContext.Provider>
  );
}

export function useIndustryProfile() {
  const ctx = useContext(IndustryProfileContext);
  if (!ctx) throw new Error("useIndustryProfile must be used within IndustryProfileProvider");
  return ctx;
}