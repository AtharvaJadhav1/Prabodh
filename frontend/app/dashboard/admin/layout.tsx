import type { Metadata } from "next";
import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { AdminProvider } from "../../../components/admin/AdminProvider";

export const metadata: Metadata = {
  title: {
    default: "Admin Console",
    template: "Prabodh | %s",
  },
  description:
    "Platform Administration — manage users, mentor allocation, stages and rubrics, and broadcasts.",
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <AdminProvider>{children}</AdminProvider>
    </DashboardRoleGuard>
  );
}
