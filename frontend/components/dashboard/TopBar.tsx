"use client";

import { lockDate } from "../../data/studentDashboard";
import { ClockIcon, ShieldCheckIcon, MenuIcon } from "./icons";

type TopBarProps = {
  onMenuClick: () => void;
  title?: string;
  subtitle?: React.ReactNode;
};

export default function TopBar({ onMenuClick, title = "Student Team Workspace", subtitle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-softline bg-white/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-brand-softline p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-brand-deep">
            {title}
          </h1>
          <p className="mt-0.5 hidden items-center gap-1.5 text-xs font-medium text-brand-muted sm:flex">
            {subtitle ?? (
              <>
                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-approved" />
                SIH 2026 Internal Qualifier •
                <span className="text-brand-charcoal">SRMSET (MIT-ADT)</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1.5 text-xs font-bold text-brand-approved">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-approved opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-approved" />
            </span>
            Stage 1: Idea Submission Active
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1.5 text-xs font-bold text-brand-primary">
            <ClockIcon className="h-3.5 w-3.5" />
            Lock Date: {lockDate}
          </span>
        </div>
      </div>
    </header>
  );
}