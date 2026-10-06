"use client";

import NotificationBell from "../chrome/NotificationBell";
import RefreshButton from "../chrome/RefreshButton";
import { MenuIcon } from "../dashboard/icons";

export type IndustryTopBarProps = {
  onMenuClick: () => void;
  title?: string;
  /** Whether the mobile sidebar drawer is open (drives aria-expanded). */
  menuOpen?: boolean;
  /** id of the sidebar element the menu button controls. */
  menuControlsId?: string;
};

export default function IndustryTopBar({ onMenuClick, title, menuOpen = false, menuControlsId }: IndustryTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-2 border-b border-brand-softline bg-white/90 px-3 backdrop-blur-sm sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="shrink-0 rounded-lg border border-brand-softline p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
        aria-label={menuOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={menuOpen}
        aria-controls={menuControlsId}
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="flex h-full min-w-0 flex-1 items-center">
        <h1 className="m-0 min-w-0 text-lg font-bold leading-none text-brand-deep max-sm:line-clamp-2 max-sm:break-words max-sm:text-base max-sm:leading-tight sm:truncate sm:text-2xl">
          {title ?? "Industry Mentor Workspace"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <RefreshButton />
        <NotificationBell />
      </div>
    </header>
  );
}