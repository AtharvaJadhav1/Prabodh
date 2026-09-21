"use client";

import { useState } from "react";
import IndustrySidebar from "./IndustrySidebar";
import IndustryTopBar from "./IndustryTopBar";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function IndustryShell({ children, title }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-canvas">
      <IndustrySidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <IndustryTopBar onMenuClick={() => setMobileOpen((v) => !v)} title={title} />
        <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-12 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}