export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

/** What the history shows: an accepted invite whose seat was later taken away is "unassigned". */
export type InviteDisplayStatus = InviteStatus | "unassigned";

export type MentorInvite = {
  id: string;
  /** Team the invitation is for. */
  teamName: string;
  teamCode: string;
  /** Faculty mentor who sent the invitation (null when the backend did not include it). */
  invitedByName: string | null;
  status: InviteDisplayStatus;
  invitedAt: string;
  respondedAt: string | null;
};

/** Human label for an invite status. The backend stores decline and withdraw both as "revoked". */
export function inviteStatusLabel(status: InviteDisplayStatus): string {
  switch (status) {
    case "unassigned":
      return "Unassigned";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "revoked":
      return "Declined / withdrawn";
    default:
      return "Pending";
  }
}
