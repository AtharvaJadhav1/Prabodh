export type InviteStatus = "pending" | "accepted" | "revoked";

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

export function mentorsForGroup(_invites: MentorInvite[], _teamId: string): MentorInvite[] {
  return [];
}