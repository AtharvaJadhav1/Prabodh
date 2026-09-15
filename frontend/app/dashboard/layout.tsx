import type { ReactNode } from "react";

/**
 * Dashboard shell is a pass-through.
 * Auth is enforced client-side via JWT session (AuthProvider + DashboardRoleGuard).
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
