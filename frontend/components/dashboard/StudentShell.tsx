"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import DashboardShell from "./DashboardShell";
import { MessageIcon } from "./icons";

const TITLES: Record<string, string> = {
  "/dashboard/student": "Team Workspace",
  "/dashboard/student/problem-statements": "Problem Statement Selection",
  "/dashboard/student/group-requests": "Team Formation & Group Requests",
  "/dashboard/student/mentors": "Assigned Mentors",
  "/dashboard/student/profile": "My Profile",
  "/dashboard/student/discussion": "Messages",
};

export default function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Dashboard";
  const isMessages = pathname.startsWith("/dashboard/student/discussion");
  return (
    <DashboardShell
      title={title}
      titleIcon={isMessages ? <MessageIcon className="h-6 w-6 text-brand-primary" /> : undefined}
      flush={isMessages}
    >
      {children}
    </DashboardShell>
  );
}
