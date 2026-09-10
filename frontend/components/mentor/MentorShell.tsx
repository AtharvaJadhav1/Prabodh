"use client";

import { useState } from "react";
import MentorSidebar from "./MentorSidebar";
import MentorTopBar, { type MentorTopBarProps } from "./MentorTopBar";

type Props = {
  children: React.ReactNode;
} & Pick<MentorTopBarProps, "breadcrumb" | "title" | "subtitle" | "showActions">;

export default function MentorShell({ children, breadcrumb, title, subtitle, showActions }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-cream">
      <MentorSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-72">
        <MentorTopBar
          onMenuClick={() => setMobileOpen((v) => !v)}
          breadcrumb={breadcrumb}
          title={title}
          subtitle={subtitle}
          showActions={showActions}
        />
        <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
