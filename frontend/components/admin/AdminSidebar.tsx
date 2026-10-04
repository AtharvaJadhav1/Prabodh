"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  PersonIcon,
  BriefcaseIcon,
  CompassIcon,
  UsersIcon,
  HistoryIcon,
  LogoutIcon,
  XIcon,
  ChevronRightIcon,
} from "../dashboard/icons";
import { useAuth, initialsFrom } from "../auth/AuthProvider";
import { useAdmin } from "./AdminProvider";

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

export default function AdminSidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { metrics } = useAdmin();
  const { session, logout } = useAuth();

  const navSections: { heading: string; items: NavItem[] }[] = [
    {
      heading: "",
      items: [
        { label: "Overview", href: "/dashboard/admin", match: "exact", icon: DashboardIcon },
        { label: "Manage Users", href: "/dashboard/admin/users", match: "start", icon: PersonIcon },
        { label: "Teams", href: "/dashboard/admin/teams", match: "start", icon: UsersIcon },
        {
          label: "Mentor Allocation",
          href: "/dashboard/admin/mentor-allocation",
          match: "start",
          icon: BriefcaseIcon,
          badge: metrics.pendingAllocations > 0 ? String(metrics.pendingAllocations) : undefined,
        },
        { label: "Audit Logs", href: "/dashboard/admin/logs", match: "start", icon: HistoryIcon },
        { label: "Reports", href: "/dashboard/admin/reports", match: "start", icon: CompassIcon },
      ],
    },
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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-brand-softline bg-[#FAF7F2] transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-2 border-b border-brand-softline px-5">
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
              className="rounded-lg p-1.5 text-brand-muted transition-colors hover:text-brand-deep lg:hidden"
              aria-label="Close sidebar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

<div className="px-4 pb-4 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-softline bg-brand-knowledge px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            Platform &bull; Nodal Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
<div key={section.heading || section.items[0]?.label || "section"}>
                {section.heading ? (
                  <div className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    {section.heading}
                  </div>
                ) : null}
              {section.items.map((item) => {
                const active =
                  item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-150 ${
                      active
                        ? "bg-[#c25e24] font-medium text-white shadow-sm"
                        : "font-medium text-stone-700 hover:bg-stone-200/50 hover:text-stone-900"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-white" : "text-stone-400 group-hover:text-stone-900"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          active ? "bg-white/20 text-white" : "bg-[#C25E26] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto pb-4">
          <Link
            href="/dashboard/admin/profile"
            onClick={onCloseMobile}
            className={`group mx-3 mb-2 flex cursor-pointer items-center gap-3 rounded-2xl border bg-white/80 p-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(200,90,23,0.18)] hover:border-amber-400/60 ${
              pathname.endsWith("/profile")
                ? "border-amber-500 ring-2 ring-amber-500/20"
                : "border-amber-900/10 hover:bg-white"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3c2415] text-sm font-bold text-[#ffddb8]">
              {initialsFrom(session?.fullName ?? "AD")}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span
                title={session?.fullName ?? "Platform Administrator"}
                className="max-w-full truncate text-sm font-semibold leading-tight text-[#3C1D06]"
              >
                {session?.fullName ?? "Platform Administrator"}
              </span>
              <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold leading-tight text-amber-800">
                <span className="truncate">Nodal Admin</span>
              </span>
            </div>
            <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-amber-600" />
          </Link>
          <div className="px-3">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d95c26] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c04d1c] active:scale-[0.98]"
            >
              <LogoutIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}