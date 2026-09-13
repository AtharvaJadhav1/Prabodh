import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { MentorRequestProvider } from "../../../components/mentor/MentorRequestProvider";

export const metadata = {
  title: "Prabodh | Mentor Dashboard",
  description:
    "Mentor Evaluation Hub — monitor assigned student cohorts, review submissions, and record official rubric scores.",
};

export default function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <MentorRequestProvider>{children}</MentorRequestProvider>
    </DashboardRoleGuard>
  );
}
