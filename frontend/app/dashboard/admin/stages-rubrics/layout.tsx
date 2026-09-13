import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stages & Rubrics",
  description: "Configure hackathon stages, deadlines, and scoring rubric criteria.",
};

export default function AdminStagesRubricsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}