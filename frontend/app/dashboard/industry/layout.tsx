import type { Metadata } from "next";
import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { IndustryMentorProvider } from "../../../components/industry/IndustryMentorProvider";

export const metadata: Metadata = {
  title: {
    default: "Industry Overview",
    template: "Prabodh | %s",
  },
  description:
    "Industry Mentor Hub — respond to institute mentor invites and review the teams shared with you.",
};

export default function IndustryDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <IndustryMentorProvider>{children}</IndustryMentorProvider>
    </DashboardRoleGuard>
  );
}
