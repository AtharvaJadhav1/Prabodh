"use client";

import NotificationBell from "../chrome/NotificationBell";
import RefreshButton from "../chrome/RefreshButton";
import { useAuth } from "../auth/AuthProvider";
import { MenuIcon } from "../dashboard/icons";

export type IndustryTopBarProps = {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
};

export default function IndustryTopBar({ onMenuClick, title, subtitle }: IndustryTopBarProps) {
  const { session } = useAuth();
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
          <h1 className="truncate text-base font-bold tracking-tight text-brand-deep sm:text-xl">
            {title ?? "Industry Mentor Workspace"}
          </h1>
          <p className="mt-0.5 hidden items-center gap-1.5 text-xs font-medium text-brand-muted sm:flex">
            {subtitle ?? (session?.institute ?? "MIT Art, Design and Technology University")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1.5 text-xs font-bold text-brand-approved">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-approved opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-approved" />
            </span>
            Round 1 Active Cycle
          </span>
          <RefreshButton />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}