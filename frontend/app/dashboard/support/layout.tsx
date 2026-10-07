import type { Metadata } from "next";
import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import SupportShell from "../../../components/support/SupportShell";

export const metadata: Metadata = {
  title: {
    default: "Support Inbox",
    template: "Prabodh | %s",
  },
  description: "Prabodh Support — every user's Support conversation in one place.",
};

export default function SupportDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <SupportShell>{children}</SupportShell>
    </DashboardRoleGuard>
  );
}
