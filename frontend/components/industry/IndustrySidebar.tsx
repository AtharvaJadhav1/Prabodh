"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DashboardIcon,
  InboxIcon,
  BriefcaseIcon,
  FileCheckIcon,
  PersonIcon,
  LogoutIcon,
  XIcon,
  ChevronRightIcon,
} from "../dashboard/icons";
import { roleLabel, useAuth } from "../auth/AuthProvider";
import RoleSwitcher from "../auth/RoleSwitcher";
import { useIndustryMentor } from "./IndustryMentorProvider";
import Avatar from "../Avatar";
import { resolveMentorAvatarUrl } from "../../lib/mentorAvatar";

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type NavItem = {
  label: string;
  href: string;
  match: "exact" | "start";
  icon: typeof DashboardIcon;
  badge?: string;
};

export default function IndustrySidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { pendingCount } = useIndustryMentor();
  const { session, logout } = useAuth();
  const role = roleLabel(session?.activeRole ?? session?.platformRole ?? "industry_mentor");
  const fullName = session?.fullName ?? "Industry Mentor";
  const displayName = fullName.length > 16 ? fullName.split(" ")[0] : fullName;

  // Below lg the sidebar is an off-canvas drawer: keep it out of the tab order / a11y tree while closed.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const drawerHidden = !isDesktop && !mobileOpen;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  const navItems: NavItem[] = [
    { label: "Overview", href: "/dashboard/industry", match: "exact", icon: DashboardIcon },
    {
      label: "Pending Invites",
      href: "/dashboard/industry/invites",
      match: "start",
      icon: InboxIcon,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    { label: "My Mentors", href: "/dashboard/industry/mentors", match: "start", icon: BriefcaseIcon },
    { label: "Assigned Teams", href: "/dashboard/industry/teams", match: "start", icon: FileCheckIcon },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-deep/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="industry-sidebar"
        aria-label="Industry mentor navigation"
        aria-hidden={drawerHidden ? true : undefined}
        inert={drawerHidden}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-lg:max-w-[85vw] flex-col border-r border-brand-softline bg-[#FAF7F2] transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 min-h-[64px] max-h-16 shrink-0 items-center justify-between gap-2 border-b border-brand-softline px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
              alt="Prabodh"
              width={1000}
              height={233}
              priority
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white hover:text-brand-deep lg:hidden"
              aria-label="Close sidebar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-4">
          {navItems.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.href
                : item.match === "start"
                  ? pathname.startsWith(item.href)
                  : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                    : "text-brand-charcoal/80 hover:bg-white hover:text-brand-deep"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    className={`h-5 w-5 ${active ? "text-white" : "text-brand-muted group-hover:text-brand-primary"}`}
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                </span>
                {item.badge && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-softline px-4 py-4 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3">
            <RoleSwitcher />
            <Link
              href="/dashboard/industry/profile"
              onClick={onCloseMobile}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-brand-softline bg-white p-3 shadow-sm transition-all duration-200 hover:border-brand-softline hover:bg-brand-cream/80 hover:shadow-md"
            >
              <Avatar
                src={resolveMentorAvatarUrl("INDUSTRY", {
                  profileJson: session?.profileJson,
                  email: session?.email,
                  fullName,
                })}
                seed={fullName}
                className="h-10 w-10 border-2 border-white shadow-sm"
              />
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <span className="max-w-full truncate text-sm font-semibold leading-tight text-brand-deep">
                  {displayName}
                </span>
                <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-brand-cream px-2 py-0.5 text-xs font-medium leading-tight text-brand-muted">
                  <span className="truncate">{role}</span>
                </span>
              </div>
              <div className="ml-auto flex-shrink-0 text-brand-muted transition-colors duration-200 group-hover:text-brand-deep">
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition-all duration-200 hover:bg-brand-hover hover:shadow-md sm:text-sm"
            >
              <LogoutIcon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}