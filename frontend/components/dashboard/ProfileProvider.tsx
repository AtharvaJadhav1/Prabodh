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
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { teamName, role, team } = useTeam();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [section, setSection] = useState<StudentEditSection>("basic");

  useEffect(() => {
    if (!session) return;
    setProfile((prev) => ({
      ...prev,
      initials: initialsFrom(session.fullName),
      fullName: session.fullName,
      school: session.institute ?? prev.school,
      prn: session.email,
      team: teamName,
      role,
      contacts: {
        ...prev.contacts,
        email: session.email,
        phone: session.phone ?? prev.contacts.phone,
      },
    }));
  }, [session, teamName, role, team?.id]);

  const openDrawer = (nextSection: StudentEditSection = "basic") => {
    setSection(nextSection);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const updateBasicInfo: ProfileContextValue["updateBasicInfo"] = (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const updateContacts: ProfileContextValue["updateContacts"] = (contacts) => {
    setProfile((prev) => ({ ...prev, contacts }));
  };

  const updateSkills: ProfileContextValue["updateSkills"] = (skills) => {
    setProfile((prev) => ({ ...prev, skills }));
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        drawerOpen,
        section,
        openDrawer,
        closeDrawer,
        updateBasicInfo,
        updateContacts,
        updateSkills,
        setProjects: (projects) => setProfile((prev) => ({ ...prev, projects })),
        setCertifications: (certifications) => setProfile((prev) => ({ ...prev, certifications })),
        setExperience: (experience) => setProfile((prev) => ({ ...prev, experience })),
        setAchievements: (achievements) => setProfile((prev) => ({ ...prev, achievements })),
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