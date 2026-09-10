import { MentorRequestProvider } from "../../../components/mentor/MentorRequestProvider";

export const metadata = {
  title: "Mentor Dashboard | SIH 2026 Portal | MIT-ADT University",
  description:
    "Mentor Evaluation Hub — monitor assigned student cohorts, review submissions, and record official rubric scores.",
};

export default function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <MentorRequestProvider>{children}</MentorRequestProvider>;
}
