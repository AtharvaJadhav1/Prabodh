export type Skill = { name: string; level?: string; tag?: string };

export type Project = {
  title: string;
  badge?: string;
  team: string;
  role?: string;
  repo: string;
  description: string;
  stack: string[];
};

export type Certification = {
  name: string;
  issuer: string;
  credential?: string;
  date?: string;
  verified: boolean;
};

export type Experience = {
  title: string;
  org: string;
  period: string;
  location?: string;
  current?: boolean;
  description: string;
};

export type Achievement = {
  title: string;
  description: string;
};

export const profile = {
  initials: "",
  fullName: "",
  verified: true,
  bio: "",
  school: "",
  prn: "",
  team: "",
  role: "",
  hackathonBadge: "Smart India Hackathon",
  contacts: {
    phone: "",
    email: "",
    github: "",
    linkedin: "",
    website: "",
  },
  skills: {
    primary: [] as Skill[],
    secondary: [] as string[],
    tracks: [] as string[],
  },
  projects: [] as Project[],
  certifications: [] as Certification[],
  experience: [] as Experience[],
  achievements: [] as Achievement[],
};

export type Profile = typeof profile;
