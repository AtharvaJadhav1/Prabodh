import type { Metadata } from "next";
import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import ExpertShell from "../../../components/expert/ExpertShell";

export const metadata: Metadata = {
  title: {
    default: "Expert Overview",
    template: "Prabodh | %s",
  },
  description: "Student Expert Workspace — Prabodh.",
};

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <ExpertShell>{children}</ExpertShell>
    </DashboardRoleGuard>
  );
}