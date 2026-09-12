"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { useTeam } from "./TeamProvider";
import {
  DashboardIcon,
  FileCodeIcon,
  UserPlusIcon,
  GradCapIcon,
  PersonIcon,
  LogoutIcon,
  LockIcon,
  ShieldCheckIcon,
  XIcon,
} from "./icons";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard/student", match: "exact", icon: DashboardIcon },
  {
    label: "Problem Statements",
    href: "/dashboard/student/problem-statements",
    match: "prefix",
    icon: FileCodeIcon,
  },
  {
    label: "Group Requests",
    href: "/dashboard/student/group-requests",
    match: "prefix",
    badge: true,
    icon: UserPlusIcon,
  },
  { label: "Mentors", href: "/dashboard/student/mentors", match: "prefix", chip: "Dual Track", icon: GradCapIcon },
  { label: "Profile", href: "/dashboard/student/profile", match: "exact", icon: PersonIcon },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { filledCount, pendingRequestCount, role, teamName, capacity, team } = useTeam();

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-softline bg-[#FAF7F2] transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-brand-softline px-5 py-4">
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

        <div className="border-b border-brand-softline px-4 py-4">
          <div className="rounded-2xl border border-brand-softline bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Active Team</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-approved">
                <LockIcon className="h-3 w-3" /> {team?.status ?? "forming"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="font-extrabold text-brand-deep">{teamName}</span>
              <span className="font-semibold text-brand-muted">
                {filledCount}/{capacity}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.href
                : item.match === "prefix"
                  ? pathname.startsWith(item.href)
                  : false;
            const Icon = item.icon;
            const chip =
              item.badge && pendingRequestCount > 0 ? String(pendingRequestCount) : item.chip;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                    : "text-brand-charcoal/80 hover:bg-white hover:text-brand-deep"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 ${active ? "text-white" : "text-brand-muted group-hover:text-brand-primary"}`}
                  />
                  <span>{item.label}</span>
                </span>
                {chip && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badge
                        ? "bg-brand-primary text-white"
                        : active
                          ? "bg-white/20 text-white"
                          : "bg-brand-softline text-brand-charcoal/70"
                    }`}
                  >
                    {chip}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-softline px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-brand-softline bg-white p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-white">
                {initialsFrom(session?.fullName ?? "S")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-brand-deep">{session?.fullName ?? "Student"}</p>
                <p className="text-xs font-medium text-brand-muted">
                  {role} • {session?.email ?? ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="inline-flex items-center gap-2.5 rounded-xl border border-brand-softline bg-white px-3 py-2.5 text-sm font-semibold text-brand-charcoal/80 transition-colors hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary"
            >
              <LogoutIcon className="h-5 w-5 text-brand-muted" />
              <span>Logout</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-brand-muted">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-approved" />
                SIH Verified
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}