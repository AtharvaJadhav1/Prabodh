"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import LoadingState from "../LoadingState";
import { allRoles, dashboardForRole, type PlatformRole } from "../../lib/session";

const ROUTE_ROLES: Record<string, PlatformRole[]> = {
  "/dashboard/student": ["student"],
  "/dashboard/mentor": ["institute_mentor"],
  "/dashboard/industry": ["industry_mentor"],
  "/dashboard/admin": ["admin"],
  "/dashboard/expert": ["student_expert"],
};

function rolesForPath(pathname: string): PlatformRole[] | null {
  const match = Object.keys(ROUTE_ROLES).find((prefix) => pathname.startsWith(prefix));
  return match ? ROUTE_ROLES[match] : null;
}

export default function DashboardRoleGuard({ children }: { children: ReactNode }) {
  const { session, ready, syncActiveRole } = useAuth();
  const syncAttempted = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const allowed = rolesForPath(pathname);

  useEffect(() => {
    if (!ready || !session || !allowed) return;
    // Dual-role accounts may visit any dashboard one of their held roles owns.
    if (!allowed.some((r) => allRoles(session).includes(r))) {
      router.replace(dashboardForRole(session.activeRole ?? session.platformRole));
    }
  }, [ready, session, allowed, router]);

  // Dual-role user on a dashboard for a role they hold, but activeRole points elsewhere:
  // reconcile activeRole (no navigation) so the sidebar badge and RoleSwitcher are correct.
  const userId = session?.userId;
  const activeRole = session?.activeRole;
  const held = session ? allRoles(session) : [];
  const targetRole = allowed ? allowed.find((r) => held.includes(r)) : undefined;
  const heldKey = held.join(",");
  useEffect(() => {
    if (!ready || !userId || !targetRole || !activeRole) return;
    if (activeRole === targetRole || allowed?.includes(activeRole)) return;
    const key = `${userId}:${targetRole}`;
    if (syncAttempted.current === key) return; // one attempt per user/role; avoid loops
    syncAttempted.current = key;
    void syncActiveRole(targetRole).catch(() => {
      /* server refused: leave the current role untouched */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, activeRole, targetRole, heldKey, syncActiveRole]);

  if (!ready) {
    return (
      <LoadingState
        label="Preparing your workspace"
        steps={["Verifying your session", "Loading your profile"]}
      />
    );
  }

  if (!session) return null;
  if (allowed && !allowed.some((r) => allRoles(session).includes(r))) return null;

  return children;
}
