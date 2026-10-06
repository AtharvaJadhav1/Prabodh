"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useChatUnread } from "../chat/chatUnreadStore";
import { useTeam } from "./TeamProvider";
import { DashboardIcon, FileCodeIcon, GradCapIcon, MessageIcon, UserIcon, UserPlusIcon } from "./icons";

type NavItem = {
  label: string;
  full: string;
  href: string;
  match: "exact" | "prefix";
  Icon: ComponentType<{ className?: string }>;
  badge?: "groups" | "messages";
};

const ITEMS: readonly NavItem[] = [
  { label: "Home", full: "Dashboard", href: "/dashboard/student", match: "exact", Icon: DashboardIcon },
  { label: "Problems", full: "Problem Statements", href: "/dashboard/student/problem-statements", match: "prefix", Icon: FileCodeIcon },
  { label: "Groups", full: "Group Requests", href: "/dashboard/student/group-requests", match: "prefix", Icon: UserPlusIcon, badge: "groups" },
  { label: "Mentors", full: "Mentors", href: "/dashboard/student/mentors", match: "prefix", Icon: GradCapIcon },
  { label: "Messages", full: "Messages", href: "/dashboard/student/discussion", match: "prefix", Icon: MessageIcon, badge: "messages" },
  { label: "Profile", full: "Profile", href: "/dashboard/student/profile", match: "prefix", Icon: UserIcon },
];

type Theme = {
  bar: string;
  idle: string;
  active: string;
  pill: string;
  press: string;
  badge: string;
  ring: string;
};

const THEMES: Record<"dashboard" | "chat", Theme> = {
  dashboard: {
    bar: "border-t border-brand-softline bg-white/95 backdrop-blur-sm",
    idle: "text-brand-muted",
    active: "text-brand-primary",
    pill: "bg-brand-primary/10",
    press: "group-active:bg-brand-primary/10",
    badge: "bg-brand-primary text-white ring-2 ring-white",
    ring: "focus-visible:outline-brand-primary",
  },
  chat: {
    bar: "border-t border-chat-line bg-chat-header",
    idle: "text-chat-muted",
    active: "text-chat-brandText",
    pill: "bg-chat-brandSoft",
    press: "group-active:bg-chat-press",
    badge: "bg-chat-brand text-white ring-2 ring-chat-header",
    ring: "focus-visible:outline-chat-brand",
  },
};

function count(n: number): string | null {
  return n > 0 ? (n > 99 ? "99+" : String(n)) : null;
}

/**
 * Primary navigation for students below `lg`. `dashboard` is fixed to the viewport bottom of dashboard pages;
 * `chat` sits in the flow at the bottom of the mobile chat home and uses the chat theme tokens.
 */
export default function StudentBottomNav({ variant }: { variant: "dashboard" | "chat" }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const chatUnread = useChatUnread(!!session);
  const { pendingRequestCount, incomingInvites } = useTeam();
  const t = THEMES[variant];
  const groups = incomingInvites.length > 0 ? incomingInvites.length : pendingRequestCount;

  return (
    <nav
      aria-label="Primary"
      data-bottom-nav=""
      className={`${variant === "dashboard" ? "fixed inset-x-0 bottom-0 z-40" : "relative z-30 shrink-0"} lg:hidden ${t.bar}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-xl items-stretch">
        {ITEMS.map(({ label, full, href, match, Icon, badge }) => {
          const active = match === "exact" ? pathname === href : pathname.startsWith(href);
          const n = badge === "groups" ? count(groups) : badge === "messages" ? count(chatUnread.total) : null;
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                aria-label={n ? `${full}, ${n} ${badge === "messages" ? "unread" : "pending"}` : full}
                className={`group flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold leading-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${t.ring} ${
                  active ? t.active : t.idle
                }`}
              >
                <span
                  className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-150 group-active:scale-90 motion-reduce:transition-none motion-reduce:group-active:scale-100 ${
                    active ? t.pill : `bg-transparent ${t.press}`
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                  {n ? (
                    <span
                      aria-hidden="true"
                      className={`absolute -right-0.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${t.badge}`}
                    >
                      {n}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
