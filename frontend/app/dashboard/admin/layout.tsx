import { AdminProvider } from "../../../components/admin/AdminProvider";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
