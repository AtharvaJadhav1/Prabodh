"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function AdminShell({ children, title }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-canvas">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-72">
        <AdminTopBar onMenuClick={() => setMobileOpen((v) => !v)} title={title} />
        <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}