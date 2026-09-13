"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import GroupDrawer from "./GroupDrawer";
import ProfileEditDrawer from "./ProfileEditDrawer";

type DashboardShellProps = {
  children: ReactNode;
  title?: string;
};

export default function DashboardShell({ children, title }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-canvas">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setMobileOpen((v) => !v)} title={title} />
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-12 lg:px-8">{children}</main>
      </div>
      <GroupDrawer />
      <ProfileEditDrawer />
    </div>
  );
}