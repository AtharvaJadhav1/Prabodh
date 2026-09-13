import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentor Allocation",
  description: "Assign or reassign Institute Mentors to every registered team.",
};

export default function AdminMentorAllocationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}