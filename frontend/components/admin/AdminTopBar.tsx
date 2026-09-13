"use client";

import NotificationBell from "../chrome/NotificationBell";
import RefreshButton from "../chrome/RefreshButton";
import { MenuIcon } from "../dashboard/icons";

export type AdminTopBarProps = {
  onMenuClick: () => void;
  title?: string;
};

export default function AdminTopBar({ onMenuClick, title = "Admin Console" }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-3 border-b border-brand-softline bg-[#FAF7F2]/80 px-6 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-brand-softline p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <h1 className="m-0 flex items-center truncate text-xl font-bold leading-none text-brand-deep sm:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RefreshButton />
        <NotificationBell />
      </div>
    </header>
  );
}