import type { ReactNode } from "react";

/**
 * Dashboard shell is a pass-through.
 * Auth is enforced by Clerk middleware + client session sync.
 * A server redirect here raced the Clerk cookie and bounced users back to login.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
