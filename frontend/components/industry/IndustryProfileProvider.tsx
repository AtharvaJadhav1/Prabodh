"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { MentorGroup } from "../../data/mentorDashboard";
import { useAuth } from "../auth/AuthProvider";
import { initials as initialsOf } from "../../lib/initials";
import { normalizeExternalUrl } from "../../lib/url";
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
  /** Legacy pre-column value; the backfill migration copied these into linkedin_url. */
  linkedinUrl?: string;
  domainExpertise?: string[];
  coreSkills?: string[];
  experienceYears?: string;
  trackRecord?: IndustryTrackRecordEntry[];
};

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function strList(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
}

function trackRecordList(v: unknown): IndustryTrackRecordEntry[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      teamName: str(x.teamName) ?? "",
      problemCode: str(x.problemCode) ?? "",
      track: str(x.track) ?? "",
      status: str(x.status) ?? "",
      outcome: str(x.outcome) ?? "",
    }));
}

/** Validate the untyped profileJson blob instead of blindly casting it. */
function parseSavedProfile(raw: unknown): SavedIndustryProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  return {
    designation: str(r.designation),
    company: str(r.company),
    roleBadge: str(r.roleBadge),
    location: str(r.location),
    linkedinUrl: str(r.linkedinUrl),
    domainExpertise: strList(r.domainExpertise),
    coreSkills: strList(r.coreSkills),
    experienceYears: str(r.experienceYears) ?? (typeof r.experienceYears === "number" ? String(r.experienceYears) : undefined),
    trackRecord: trackRecordList(r.trackRecord),
  };
}

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
  designation: "",
  phone: "",
  location: "",
  industryMentorId: "",
  roleBadge: "",
  linkedinUrl: "",
  domainExpertise: [],
  coreSkills: [],
  experienceYears: "",
  trackRecord: [],
};

function studentsGuidedFrom(cohorts: MentorGroup[]): number {
  return cohorts.reduce((sum, cohort) => sum + cohort.memberCount, 0);
}

export function IndustryProfileProvider({ children }: { children: ReactNode }) {
  const { session, refreshMe } = useAuth();
  const { pendingInvites, allTeams: visibleTeams } = useIndustryMentor();
  const [profile, setProfile] = useState<IndustryProfile>(defaultProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<IndustryEditSection>("profile");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    const saved = parseSavedProfile(session.profileJson);
    setProfile((prev) => ({
      ...defaultProfile,
      ...prev,
      initials: initialsOf(session.fullName) || defaultProfile.initials,
      fullName: session.fullName,
      email: session.email,
      phone: session.phone ?? "",
      industryMentorId: session.userId,
      company: session.institute ?? saved.company ?? "",
      designation: session.department ?? saved.designation ?? "",
      roleBadge: saved.roleBadge ?? "",
      location: saved.location ?? "",
      linkedinUrl: session.linkedinUrl ?? saved.linkedinUrl ?? "",
      domainExpertise: saved.domainExpertise ?? [],
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

  const saveProfile: IndustryProfileContextValue["saveProfile"] = async (input) => {
    const previous = profile;
    const next: IndustryProfile = { ...input, linkedinUrl: normalizeExternalUrl(input.linkedinUrl) };
    setProfile(next);
    setSaving(true);
    try {
      await apiPatch("/me", {
        fullName: next.fullName,
        institute: next.company,
        department: next.designation,
        phone: next.phone,
        linkedinUrl: next.linkedinUrl,
        profileJson: {
          designation: next.designation,
          company: next.company,
          roleBadge: next.roleBadge,
          location: next.location,
          domainExpertise: next.domainExpertise,
          coreSkills: next.coreSkills,
          experienceYears: next.experienceYears,
          trackRecord: next.trackRecord,
        },
      });
    } catch (err) {
      // Roll back the optimistic update; the drawer surfaces the thrown error.
      setProfile(previous);
      setSaving(false);
      throw err;
    }
    try {
      await refreshMe();
    } catch {
      /* saved server-side; the optimistic profile stays until the next refresh */
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