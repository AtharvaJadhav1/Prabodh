"use client";

import { useState } from "react";
import IndustrySidebar from "./IndustrySidebar";
import IndustryTopBar, { type IndustryTopBarProps } from "./IndustryTopBar";

type Props = {
  children: React.ReactNode;
} & Pick<IndustryTopBarProps, "breadcrumb" | "title" | "subtitle" | "showActions">;

export default function IndustryShell({ children, breadcrumb, title, subtitle, showActions }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-cream">
      <IndustrySidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-72">
        <IndustryTopBar
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
