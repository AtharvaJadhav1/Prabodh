import type { ReactNode } from "react";
import { TeamProvider } from "../../../components/dashboard/TeamProvider";
import { ProfileProvider } from "../../../components/dashboard/ProfileProvider";

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TeamProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </TeamProvider>
  );
}