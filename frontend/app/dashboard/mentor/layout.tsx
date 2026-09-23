import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { MentorRequestProvider } from "../../../components/mentor/MentorRequestProvider";
import { MentorTeamsProvider } from "../../../components/mentor/MentorTeamsProvider";

export const metadata = {
  title: {
    default: "Mentor Dashboard",
    template: "Prabodh | %s",
  },
  description:
    "Mentor Dashboard — monitor assigned student cohorts, track teams, and review problem statement approvals.",
};

export default function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <MentorTeamsProvider>
        <MentorRequestProvider>{children}</MentorRequestProvider>
      </MentorTeamsProvider>
    </DashboardRoleGuard>
  );
}
