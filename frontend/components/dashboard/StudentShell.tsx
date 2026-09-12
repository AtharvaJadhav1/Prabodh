"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import DashboardShell from "./DashboardShell";

const TITLES: Record<string, string> = {
  "/dashboard/student": "Team Workspace",
  "/dashboard/student/problem-statements": "Problem Statement Selection",
  "/dashboard/student/group-requests": "Team Formation & Group Requests",
  "/dashboard/student/mentors": "Assigned Mentors",
  "/dashboard/student/profile": "My Profile",
};

export default function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  return <DashboardShell title={title}>{children}</DashboardShell>;
}
