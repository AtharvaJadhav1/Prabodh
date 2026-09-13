"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  PersonIcon,
  BriefcaseIcon,
  FileCheckIcon,
  MessageIcon,
  CompassIcon,
  LogoutIcon,
  XIcon,
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
      heading: "Platform Management",
      items: [
        { label: "Overview", href: "/dashboard/admin", match: "exact", icon: DashboardIcon },
        { label: "Manage Users", href: "/dashboard/admin/users", match: "start", icon: PersonIcon },
        {
          label: "Mentor Allocation",
          href: "/dashboard/admin/mentor-allocation",
          match: "start",
          icon: BriefcaseIcon,
          badge: metrics.pendingAllocations > 0 ? String(metrics.pendingAllocations) : undefined,
        },
        { label: "Stages & Rubrics", href: "/dashboard/admin/stages-rubrics", match: "start", icon: FileCheckIcon },
        { label: "Broadcasts", href: "/dashboard/admin/broadcasts", match: "start", icon: MessageIcon },
        { label: "Reports", href: "/dashboard/admin/reports", match: "start", icon: CompassIcon },
      ],
    },
    {
      heading: "Account",
      items: [
        { label: "My Profile", href: "/dashboard/admin/profile", match: "start", icon: PersonIcon },
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

        <div className="px-4 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-softline bg-brand-knowledge px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            Platform &bull; Nodal Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.heading}>
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                {section.heading}
              </div>
              {section.items.map((item) => {
                const active =
                  item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-[#C25E26] font-semibold text-white shadow-sm"
                        : "font-medium text-brand-charcoal/80 hover:bg-brand-softline/50 hover:text-brand-deep"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? "text-white" : "text-brand-muted group-hover:text-brand-deep"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          active ? "bg-white/25 text-white" : "bg-[#C25E26] text-white"
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

        <div className="border-t border-brand-softline bg-white/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-white">
              {initialsFrom(session?.fullName ?? "AD")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-brand-deep">
                {session?.fullName ?? "Platform Administrator"}
              </p>
              <p className="truncate text-xs font-medium text-brand-muted">Nodal Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C25E26] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#A84E1D] sm:text-sm"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}