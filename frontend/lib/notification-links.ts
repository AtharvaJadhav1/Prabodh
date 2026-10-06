import type { PlatformRole } from "./session";
import type { PortalNotification } from "./types";

export type NotificationIconKind =
  | "team"
  | "invite"
  | "friend"
  | "mentor"
  | "comment"
  | "broadcast"
  | "allocation"
  | "approval"
  | "info";

/** Pick an icon family from the action kind first, then fall back to the free-form `type`. */
export function iconKindFor(n: Pick<PortalNotification, "type" | "actionKind" | "title">): NotificationIconKind {
  switch (n.actionKind) {
    case "team_invite":
      return "invite";
    case "join_request":
      return "team";
    case "mentor_invite":
      return "mentor";
    case "friend_request":
      return "friend";
    default:
      break;
  }
  const t = `${n.type} ${n.title}`.toLowerCase();
  if (t.includes("comment") || t.includes("message") || t.includes("query")) return "comment";
  if (t.includes("broadcast") || t.includes("announce")) return "broadcast";
  if (t.includes("alloc")) return "allocation";
  if (t.includes("approv") || t.includes("reject") || t.includes("review")) return "approval";
  if (t.includes("friend")) return "friend";
  if (t.includes("mentor")) return "mentor";
  if (t.includes("invite")) return "invite";
  if (t.includes("team") || t.includes("join")) return "team";
  return "info";
}

export type NotificationDestination = { href: string; openFriends?: boolean };

/** Where clicking a notification should go for the given active role, or null when it is informational. */
export function destinationFor(
  n: Pick<PortalNotification, "type" | "actionKind" | "title">,
  role: PlatformRole | null | undefined,
): NotificationDestination | null {
  if (!role) return null;
  switch (n.actionKind) {
    case "team_invite":
    case "join_request":
      if (role === "student") return { href: "/dashboard/student/group-requests" };
      return null;
    case "mentor_invite":
      if (role === "industry_mentor") return { href: "/dashboard/industry/invites" };
      if (role === "institute_mentor") return { href: "/dashboard/mentor/group-requests" };
      if (role === "student") return { href: "/dashboard/student/mentors" };
      return null;
    case "friend_request":
      if (role === "student") return { href: "/dashboard/student/discussion?tab=friends", openFriends: true };
      if (role === "institute_mentor") return { href: "/dashboard/mentor/queries?tab=friends", openFriends: true };
      return null;
    default:
      break;
  }
  if (iconKindFor(n) === "comment") {
    if (role === "student") return { href: "/dashboard/student/discussion" };
    if (role === "institute_mentor") return { href: "/dashboard/mentor/queries" };
  }
  return null;
}
