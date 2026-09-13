"use client";

import NotificationBell from "../chrome/NotificationBell";
import RefreshButton from "../chrome/RefreshButton";
import { useTeam } from "./TeamProvider";
import { MenuIcon } from "./icons";

type TopBarProps = {
  onMenuClick: () => void;
  title?: string;
};

export default function TopBar({ onMenuClick, title = "Team Workspace" }: TopBarProps) {
  const { stages } = useTeam();
  const stage = stages.find((s) => s.isActive) ?? stages[0];
  return (
    <header className="sticky top-0 z-20 flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-3 border-b border-brand-softline bg-white/90 px-6 backdrop-blur-sm">
      <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-brand-softline p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="flex h-full min-w-0 flex-1 items-center">
          <h1 className="m-0 flex items-center truncate text-xl font-bold leading-none text-brand-deep sm:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1.5 text-xs font-bold text-brand-approved">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-approved opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-approved" />
            </span>
            {stage?.name ?? "No stage"}
          </span>
          <RefreshButton />
          <NotificationBell />
        </div>
    </header>
  );
}