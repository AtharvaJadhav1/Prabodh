import { allGroups, type MentorGroup } from "./mentorDashboard";

export const industryMentor = {
  id: "IM265",
  name: "Rahul Bhide",
  initials: "RB",
  email: "rahul.bhide@company.com",
  phone: "+91 98907 99553",
  company: "Prasu Soft Labs Pvt Ltd",
  designation: "Lead AI Architect",
  expertise: ["NLP & LLMs", "AI Agents", "Distributed Systems", "FinTech"],
};

export type InviteStatus = "pending" | "accepted" | "declined";

export type MentorInvite = {
  id: string;
  instituteMentorId: string;
  instituteMentorName: string;
  instituteMentorInitials: string;
  instituteMentorTitle: string;
  status: InviteStatus;
  invitedAt: string;
  respondedAt: string | null;
  groupIds: string[];
};

export const initialPendingInvites: MentorInvite[] = [
  {
    id: "INV-101",
    instituteMentorId: "M161",
    instituteMentorName: "Dr. Aman Singh",
    instituteMentorInitials: "AS",
    instituteMentorTitle: "Associate Professor, CSE",
    status: "pending",
    invitedAt: "Today, 09:15 AM",
    respondedAt: null,
    groupIds: ["SIH-2026-BCAIAA89", "SIH-2026-MEDT1980"],
  },
  {
    id: "INV-102",
    instituteMentorId: "MIT-FAC-7814",
    instituteMentorName: "Dr. Ranjana Kale",
    instituteMentorInitials: "RK",
    instituteMentorTitle: "Associate Professor (IT)",
    status: "pending",
    invitedAt: "Yesterday, 03:40 PM",
    respondedAt: null,
    groupIds: ["SIH-2026-SEC9902"],
  },
];

export const initialInviteHistory: MentorInvite[] = [
  {
    id: "INV-088",
    instituteMentorId: "M161",
    instituteMentorName: "Dr. Aman Singh",
    instituteMentorInitials: "AS",
    instituteMentorTitle: "Associate Professor, CSE",
    status: "accepted",
    invitedAt: "08/06/2026",
    respondedAt: "08/06/2026",
    groupIds: ["SIH-2026-BCCS4F08", "SIH-2026-AGRO3310"],
  },
  {
    id: "INV-072",
    instituteMentorId: "MIT-FAC-7814",
    instituteMentorName: "Dr. Ranjana Kale",
    instituteMentorInitials: "RK",
    instituteMentorTitle: "Associate Professor (IT)",
    status: "declined",
    invitedAt: "07/28/2026",
    respondedAt: "07/29/2026",
    groupIds: ["SIH-2026-ENRG7100"],
  },
];

export function resolveGroupsForInvites(invites: MentorInvite[]): MentorGroup[] {
  const ids = new Set(invites.flatMap((inv) => inv.groupIds));
  return allGroups.filter((g) => ids.has(g.teamId));
}

export function mentorsForGroup(invites: MentorInvite[], teamId: string): MentorInvite[] {
  return invites.filter((inv) => inv.groupIds.includes(teamId));
}
