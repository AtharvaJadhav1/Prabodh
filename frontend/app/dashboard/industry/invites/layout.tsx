import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pending Invites",
  description: "Accept or decline invites from Institute Mentors to view their teams.",
};

export default function IndustryInvitesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}