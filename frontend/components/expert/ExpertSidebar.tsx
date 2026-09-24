"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, UsersIcon, PersonIcon, LogoutIcon, XIcon } from "../dashboard/icons";
import { roleLabel, useAuth, initialsFrom } from "../auth/AuthProvider";

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

export default function ExpertSidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const role = roleLabel(session?.platformRole ?? "student_expert");
  const fullName = session?.fullName?.trim() || "Student Expert";
  const displayName = fullName.length > 16 ? fullName.split(" ")[0] : fullName;

  const navItems: NavItem[] = [
    { label: "Overview", href: "/dashboard/expert", match: "exact", icon: DashboardIcon },
    { label: "Teams", href: "/dashboard/expert/teams", match: "start", icon: UsersIcon },
    { label: "Profile", href: "/dashboard/expert/profile", match: "start", icon: PersonIcon },
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-softline bg-[#FAF7F2] transition-transform duration-300 ease-out lg:translate-x-0 ${
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

        <div className="border-b border-brand-softline px-4 py-4">
          <div className="rounded-2xl border border-brand-softline bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Workspace Role</p>
            <p className="mt-1.5 truncate text-sm font-extrabold text-brand-deep">{role}</p>
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
                {item.badge && (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
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
                {initialsFrom(fullName)}
              </div>
              <div className="min-w-0">
                <p title={fullName} className="truncate max-w-full text-sm font-bold text-brand-deep">
                  {displayName}
                </p>
                <p className="truncate text-xs font-medium text-brand-muted">{role}</p>
              </div>
            </div>
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