"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  profile as initialProfile,
  type Profile,
  type Project,
  type Certification,
  type Experience,
  type Achievement,
} from "../../data/studentProfile";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { useTeam } from "./TeamProvider";

export type StudentEditSection =
  | "basic"
  | "contacts"
  | "skills"
  | "projects"
  | "certifications"
  | "experience"
  | "achievements";

type ProfileContextValue = {
  profile: Profile;
  drawerOpen: boolean;
  section: StudentEditSection;
  openDrawer: (section?: StudentEditSection) => void;
  closeDrawer: () => void;
  updateBasicInfo: (updates: Partial<Pick<Profile, "fullName" | "bio" | "school" | "team" | "role" | "hackathonBadge">>) => void;
  updateContacts: (contacts: Profile["contacts"]) => void;
  updateSkills: (skills: Profile["skills"]) => void;
  setProjects: (projects: Project[]) => void;
  setCertifications: (certifications: Certification[]) => void;
  setExperience: (experience: Experience[]) => void;
  setAchievements: (achievements: Achievement[]) => void;
  saveProfileJson: (profile: Profile) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function mergeProfileFromApi(base: Profile, session: { fullName: string; email: string; institute?: string | null; phone?: string | null; profileJson?: Record<string, unknown> }, teamName: string, role: string): Profile {
  const saved = (session.profileJson ?? {}) as Partial<Profile>;
  return {
    ...base,
    ...saved,
    initials: initialsFrom(session.fullName),
    fullName: session.fullName,
    school: session.institute ?? saved.school ?? base.school,
    prn: session.email,
    team: teamName,
    role,
    contacts: {
      ...base.contacts,
      ...(saved.contacts ?? {}),
      email: session.email,
      phone: session.phone ?? saved.contacts?.phone ?? base.contacts.phone,
    },
    skills: saved.skills ?? base.skills,
    projects: saved.projects ?? base.projects,
    certifications: saved.certifications ?? base.certifications,
    experience: saved.experience ?? base.experience,
    achievements: saved.achievements ?? base.achievements,
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, refreshMe } = useAuth();
  const { teamName, role, team } = useTeam();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<StudentEditSection>("basic");

  useEffect(() => {
    if (!session) return;
    setProfile((prev) =>
      mergeProfileFromApi(prev, session, teamName, role),
    );
  }, [session, teamName, role, team?.id]);

  const openDrawer = (nextSection: StudentEditSection = "basic") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const saveProfileJson = async (next: Profile) => {
    const { apiPatch } = await import("../../lib/api");
    await apiPatch("/me", {
      fullName: next.fullName,
      phone: next.contacts.phone,
      institute: next.school,
      profileJson: {
        bio: next.bio,
        hackathonBadge: next.hackathonBadge,
        contacts: next.contacts,
        skills: next.skills,
        projects: next.projects,
        certifications: next.certifications,
        experience: next.experience,
        achievements: next.achievements,
      },
    });
    setProfile(next);
    await refreshMe();
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        drawerOpen,
        section,
        openDrawer,
        closeDrawer,
        updateBasicInfo: (updates) => setProfile((prev) => ({ ...prev, ...updates })),
        updateContacts: (contacts) => setProfile((prev) => ({ ...prev, contacts })),
        updateSkills: (skills) => setProfile((prev) => ({ ...prev, skills })),
        setProjects: (projects) => setProfile((prev) => ({ ...prev, projects })),
        setCertifications: (certifications) => setProfile((prev) => ({ ...prev, certifications })),
        setExperience: (experience) => setProfile((prev) => ({ ...prev, experience })),
        setAchievements: (achievements) => setProfile((prev) => ({ ...prev, achievements })),
        saveProfileJson,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
