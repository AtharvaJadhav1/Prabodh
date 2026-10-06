"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { ChatIcon, SearchIcon } from "./chat-icons";

export type AppTabId = "chats" | "friends" | "people";

type Props = {
  tabs: Array<{ id: AppTabId; label: string; badge: number }>;
  tab: AppTabId;
  onTab: (id: AppTabId) => void;
  onTabKey: (e: KeyboardEvent, idx: number) => void;
  registerTab: (id: AppTabId, el: HTMLButtonElement | null) => void;
  query: string;
  onQuery: (q: string) => void;
  onNewChat: () => void;
  children: ReactNode;
};

const MENU_ITEMS = [
  { label: "Dashboard", href: "/dashboard/student" },
  { label: "Problem Statements", href: "/dashboard/student/problem-statements" },
  { label: "Group Requests", href: "/dashboard/student/group-requests" },
  { label: "Mentors", href: "/dashboard/student/mentors" },
  { label: "My Profile", href: "/dashboard/student/profile" },
] as const;

function KebabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function KebabMenu() {
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (items.length === 0) return;
      e.preventDefault();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const next = (idx + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      items[next]?.focus();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  const itemCls =
    "flex min-h-[48px] w-full items-center px-5 text-left text-[16px] text-brand-charcoal active:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-brand-deep active:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        <KebabIcon className="h-6 w-6" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Student menu"
          className="absolute right-1 top-full z-[60] mt-1 w-60 overflow-hidden rounded-lg bg-white py-2 shadow-xl ring-1 ring-black/5"
        >
          {MENU_ITEMS.map((m) => (
            <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpen(false)} className={itemCls}>
              {m.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/");
            }}
            className={`${itemCls} text-red-700`}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** WhatsApp-style home chrome: header, search, filter chips and a floating new-chat button around the active panel. */
export default function ChatAppHome({ tabs, tab, onTab, onTabKey, registerTab, query, onQuery, onNewChat, children }: Props) {
  const showSearch = tab !== "friends";
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-2 bg-white pb-1 pl-4 pr-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FAF7F2]">
            <Image src="/images/logo/Prabodh_Icon_Only_Web_1000px.png" alt="" width={36} height={36} className="h-7 w-7 object-contain" priority />
          </span>
          <h1 className="truncate text-[22px] font-extrabold tracking-tight text-brand-primary">Prabodh</h1>
        </div>
        <KebabMenu />
      </header>

      {showSearch ? (
        <div className="shrink-0 px-4 pb-2 pt-1">
          <label htmlFor="chat-app-search" className="sr-only">
            {tab === "people" ? "Search people by name, or type @ and an email address" : "Search your chats"}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-muted" />
            <input
              id="chat-app-search"
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={tab === "people" ? "Search people by name or @email" : "Search"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-11 w-full rounded-full bg-[#F4EEE6] pl-11 pr-4 text-[16px] text-brand-charcoal outline-none placeholder:text-brand-muted/80 focus-visible:ring-2 focus-visible:ring-brand-primary/40"
            />
          </div>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Chat sections"
        className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => registerTab(t.id, el)}
            type="button"
            role="tab"
            id={`chat-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="chat-tabpanel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              tab === t.id ? "bg-brand-lightOrange text-brand-primary" : "bg-[#F4EEE6] text-brand-muted"
            }`}
          >
            <span>{t.label}</span>
            {t.badge > 0 && t.id !== "chats" ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] font-bold text-white">
                <span aria-hidden="true">{t.badge > 99 ? "99+" : t.badge}</span>
                <span className="sr-only">{`${t.badge} friend requests`}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div id="chat-tabpanel" role="tabpanel" aria-labelledby={`chat-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      {tab !== "people" ? (
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat: find people"
          className="absolute right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <ChatIcon className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
