import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Reports",
  description: "Aggregated read-only views across teams, mentors, and scoring.",
};

export default function AdminReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}