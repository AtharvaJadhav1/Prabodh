"use client";

import Image from "next/image";
import { useAuth } from "../auth/AuthProvider";
import { LogoutIcon } from "../dashboard/icons";

type Props = {
  children: React.ReactNode;
};

/**
 * One-screen shell for the Support portal: no sidebar/nav, just a header and the chat
 * workspace — the whole job here is reading and answering every user's Support thread.
 */
export default function SupportShell({ children }: Props) {
  const { session, logout } = useAuth();
  const fullName = session?.fullName?.trim() || "Support";

  return (
    <div className="min-h-screen bg-brand-canvas">
      <header className="flex h-16 min-h-[64px] items-center justify-between gap-3 border-b border-brand-softline bg-white/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
            alt="Prabodh"
            width={1000}
            height={233}
            priority
            className="h-8 w-auto"
          />
          <span className="truncate text-sm font-bold uppercase tracking-widest text-brand-muted">Support</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden truncate text-sm font-semibold text-brand-deep sm:inline">{fullName}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <main className="lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">{children}</main>
    </div>
  );
}
