import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { IndustryMentorProvider } from "../../../components/industry/IndustryMentorProvider";

export default function IndustryDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <IndustryMentorProvider>{children}</IndustryMentorProvider>
    </DashboardRoleGuard>
  );
}
