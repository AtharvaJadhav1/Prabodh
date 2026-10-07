"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import GroupDrawer from "./GroupDrawer";
import ProfileEditDrawer from "./ProfileEditDrawer";

type DashboardShellProps = {
  children: ReactNode;
  title?: string;
  /** Optional leading icon rendered before the page title in the top bar. */
  titleIcon?: ReactNode;
  /** Full-bleed content area on lg+: no padding or max-width, exactly the viewport minus the top bar. */
  flush?: boolean;
};

export default function DashboardShell({ children, title, titleIcon, flush = false }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-canvas">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setMobileOpen((v) => !v)} title={title} titleIcon={titleIcon} />
        <main
          className={
            flush
              ? "lg:h-[calc(100dvh-4rem)] lg:overflow-hidden"
              : "mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-12 lg:px-8"
          }
        >
          {children}
        </main>
      </div>
      <GroupDrawer />
      <ProfileEditDrawer />
    </div>
  );
}