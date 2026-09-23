"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import LoadingState from "../LoadingState";
import { dashboardForRole, type PlatformRole } from "../../lib/session";

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
  const { session, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = rolesForPath(pathname);

  useEffect(() => {
    if (!ready || !session || !allowed) return;
    if (!allowed.includes(session.platformRole)) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, allowed, router]);

  if (!ready) {
    return (
      <LoadingState
        label="Preparing your workspace"
        steps={["Verifying your session", "Loading your profile"]}
      />
    );
  }

  if (!session) return null;
  if (allowed && !allowed.includes(session.platformRole)) return null;

  return children;
}
