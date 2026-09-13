import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assigned Teams",
  description: "Teams shared with you by linked Institute Mentors.",
};

export default function IndustryTeamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}