export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type MentorInvite = {
  id: string;
  /** Team the invitation is for. */
  teamName: string;
  teamCode: string;
  /** Faculty mentor who sent the invitation (null when the backend did not include it). */
  invitedByName: string | null;
  status: InviteStatus;
  invitedAt: string;
  respondedAt: string | null;
};

/** Human label for an invite status. The backend stores decline and withdraw both as "revoked". */
export function inviteStatusLabel(status: InviteStatus): string {
  switch (status) {
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
