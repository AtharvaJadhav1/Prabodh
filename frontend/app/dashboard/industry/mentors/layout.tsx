import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Mentors",
  description: "Select which linked Institute Mentors' teams you want to view.",
};

export default function IndustryMentorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}