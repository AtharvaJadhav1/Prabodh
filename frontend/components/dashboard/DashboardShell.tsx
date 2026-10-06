"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import GroupDrawer from "./GroupDrawer";
import ProfileEditDrawer from "./ProfileEditDrawer";

type DashboardShellProps = {
  children: ReactNode;
  title?: string;
  /** Student bottom navigation (below lg); adds bottom padding so content never hides behind it. */
  bottomNav?: ReactNode;
  /** Full-bleed content area on lg+: no padding or max-width, exactly the viewport minus the top bar. */
  flush?: boolean;
};

export default function DashboardShell({ children, title, bottomNav, flush = false }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-canvas">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setMobileOpen((v) => !v)} title={title} />
        <main
          className={
            flush
              ? "lg:h-[calc(100dvh-4rem)] lg:overflow-hidden"
              : bottomNav
                ? "mx-auto max-w-7xl px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-12"
                : "mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-12 lg:px-8"
          }
        >
          {children}
        </main>
      </div>
      {bottomNav}
      <GroupDrawer />
      <ProfileEditDrawer />
    </div>
  );
}