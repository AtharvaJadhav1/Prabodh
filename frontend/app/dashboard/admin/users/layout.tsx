import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Users",
  description: "Live directory of students, institute mentors, and industry mentors with CSV import.",
};

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}