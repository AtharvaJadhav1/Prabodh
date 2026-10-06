"use client";

import NotificationBell from "../chrome/NotificationBell";
import RefreshButton from "../chrome/RefreshButton";
import { MenuIcon } from "./icons";

type TopBarProps = {
  onMenuClick: () => void;
  title?: string;
};

export default function TopBar({ onMenuClick, title = "Team Workspace" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-3 border-b border-brand-softline bg-white/90 px-6 max-sm:gap-2 max-sm:px-3 backdrop-blur-sm">
      <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg border border-brand-softline p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="flex h-full min-w-0 flex-1 items-center">
          <h1 className="m-0 min-w-0 text-xl font-bold leading-none text-brand-deep max-sm:line-clamp-2 max-sm:break-words max-sm:text-base max-sm:leading-tight sm:truncate sm:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-sm:shrink-0 max-sm:flex-nowrap max-sm:gap-1.5">
          <RefreshButton />
          <NotificationBell />
        </div>
    </header>
  );
}