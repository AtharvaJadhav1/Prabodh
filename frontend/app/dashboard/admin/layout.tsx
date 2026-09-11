import DashboardRoleGuard from "../../../components/auth/DashboardRoleGuard";
import { AdminProvider } from "../../../components/admin/AdminProvider";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRoleGuard>
      <AdminProvider>{children}</AdminProvider>
    </DashboardRoleGuard>
  );
}
