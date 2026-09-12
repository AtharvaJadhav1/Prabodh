import type { ReactNode } from "react";
import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { TeamProvider } from "../../../components/dashboard/TeamProvider";
import { ProfileProvider } from "../../../components/dashboard/ProfileProvider";
import StudentShell from "../../../components/dashboard/StudentShell";

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardRoleGuard>
      <TeamProvider>
        <ProfileProvider>
          <StudentShell>{children}</StudentShell>
        </ProfileProvider>
      </TeamProvider>
    </DashboardRoleGuard>
  );
}
