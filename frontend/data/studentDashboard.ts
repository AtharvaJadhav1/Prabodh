export type StudentRole = "Team Lead" | "Team Member";

export type Member = {
  id?: string;
  name: string;
  initials: string;
  prn: string;
  branch: string;
  role: "Leader" | "Member" | null;
  status: "Verified" | "Invite Pending" | "Empty";
  female?: boolean;
  inviteEmail?: string;
  avatarUrl?: string | null;
};

export type OutgoingInvite = {
  id: string;
  email: string;
  sentAt: string;
  status: string;
};

export type JoinRequest = {
  initials: string;
  name: string;
  prn: string;
  branch: string;
  cgpa: string;
  skills: string[];
  note: string;
  requestedAt: string;
  avatarClass: string;
};

export const initialMembers: Member[] = [];
export const initialInvites: OutgoingInvite[] = [];
export const initialRequests: JoinRequest[] = [];

export type SiFolder = {
  id: string;
  title: string;
  count: number;
  filterDomain: string;
};

export type SiStatement = {
  code: string;
  ministry: string;
  category: string;
  domain: string;
  title: string;
  description: string;
  postedBy: string;
  updatedAgo: string;
};

export type ManualFormDefaults = {
  title: string;
  track: string;
  domainFit: string;
  methodology: string;
  techStack: string[];
};

export const siFolders: SiFolder[] = [
  { id: "ai", title: "AI & ML", count: 0, filterDomain: "AI" },
  { id: "govt", title: "Government", count: 0, filterDomain: "Govt" },
  { id: "startup", title: "Startup & MSME", count: 0, filterDomain: "Startup" },
  { id: "cloud", title: "Cloud & Industry", count: 0, filterDomain: "Cloud" },
];

export const siStatements: SiStatement[] = [];

export const manualFormDefaults: ManualFormDefaults = {
  title: "",
  track: "",
  domainFit: "",
  methodology: "",
  techStack: [],
};
