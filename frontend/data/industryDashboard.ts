import { type MentorGroup } from "./mentorDashboard";

export const industryMentor = {
  id: "",
  name: "",
  initials: "",
  email: "",
  phone: "",
  company: "",
  designation: "",
  expertise: [] as string[],
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

export const initialPendingInvites: MentorInvite[] = [];
export const initialInviteHistory: MentorInvite[] = [];

export function resolveGroupsForInvites(_invites: MentorInvite[]): MentorGroup[] {
  return [];
}

export function mentorsForGroup(_invites: MentorInvite[], _teamId: string): MentorInvite[] {
  return [];
}
