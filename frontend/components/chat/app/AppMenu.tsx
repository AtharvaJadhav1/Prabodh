"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { FileTextIcon, GroupIcon, HomeIcon, KebabIcon, LogoutIcon, MentorIcon, UserIcon } from "../chat-icons";

type MenuItem = { label: string; href: string; Icon: ComponentType<{ className?: string }> };

const MENU_ITEMS: readonly MenuItem[] = [
  { label: "Dashboard", href: "/dashboard/student", Icon: HomeIcon },
  { label: "Problem Statements", href: "/dashboard/student/problem-statements", Icon: FileTextIcon },
  { label: "Group Requests", href: "/dashboard/student/group-requests", Icon: GroupIcon },
  { label: "Mentors", href: "/dashboard/student/mentors", Icon: MentorIcon },
  { label: "My Profile", href: "/dashboard/student/profile", Icon: UserIcon },
];

const ITEM_CLS =
  "flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-[15px] font-medium transition-colors active:bg-chat-press focus-visible:bg-chat-press focus-visible:outline-none";

/** Kebab (three dots) menu in the chat app header: portal navigation plus Logout. */
export default function AppMenu() {
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
    const onKey = (e: KeyboardEvent) => {
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
        className="flex h-11 w-11 items-center justify-center rounded-full text-chat-text transition-colors active:bg-chat-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
      >
        <KebabIcon className="h-6 w-6" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Student menu"
          className="absolute right-1 top-full z-[60] mt-1 w-[15rem] max-w-[calc(100vw-1rem)] origin-top-right animate-pop-in overflow-hidden rounded-xl bg-chat-surface py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.22)] ring-1 ring-chat-line motion-reduce:animate-none"
        >
          {MENU_ITEMS.map(({ label, href, Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className={`${ITEM_CLS} text-chat-text`}>
              <Icon className="h-5 w-5 shrink-0 text-chat-muted" />
              <span className="min-w-0 truncate">{label}</span>
            </Link>
          ))}
          <div role="separator" className="my-1.5 h-px bg-chat-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/");
            }}
            className={`${ITEM_CLS} text-chat-danger`}
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
