import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Problem Statements",
  description: "Create, edit, and bulk-import the problem statement catalog.",
};

export default function AdminProblemStatementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
