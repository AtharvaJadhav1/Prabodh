"use client";

import NotificationBell from "../chrome/NotificationBell";
import { useAuth } from "../auth/AuthProvider";
import { ChevronRightIcon, CalendarIcon, ShieldCheckIcon } from "../dashboard/icons";

type BreadcrumbSegment = { label: string; href?: string };

export type AdminTopBarProps = {
  onMenuClick: () => void;
  breadcrumb?: BreadcrumbSegment[];
  title?: string;
  subtitle?: string;
  showActions?: boolean;
};

export default function AdminTopBar({
  onMenuClick,
  breadcrumb,
  title,
  subtitle,
  showActions = true,
}: AdminTopBarProps) {
  const { session } = useAuth();
  const crumbs: BreadcrumbSegment[] = breadcrumb ?? [
    { label: "SIH 2026 Portal" },
    { label: "Admin Console" },
    { label: "Overview" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-brand-sand bg-brand-cream/95 backdrop-blur-md">
      <div className="px-4 pt-6 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <button
              type="button"
              onClick={onMenuClick}
              className="mr-2 rounded-lg border border-brand-sand p-2 text-brand-charcoal transition-colors hover:bg-white lg:hidden"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5" />}
                {crumb.href ? (
                  <a href={crumb.href} className="transition-colors hover:text-brand-deep">{crumb.label}</a>
                ) : i === crumbs.length - 1 ? (
                  <span className="font-semibold text-brand-deep">{crumb.label}</span>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1 text-xs font-semibold text-brand-approved">
              <span className="h-2 w-2 rounded-full bg-brand-approved" />
              Round 1 Active Cycle
            </span>
            {showActions && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-sand bg-white px-3 py-1 text-xs font-medium text-brand-deep">
                <CalendarIcon className="h-3.5 w-3.5 text-brand-primary" />
                Nodal Admin Console
              </span>
            )}
            <NotificationBell />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-deep">
              {title ?? "Admin Control Center"}
            </h1>
            <p className="mt-0.5 text-xs text-brand-muted">
              {subtitle ?? `Welcome, ${session?.fullName ?? "admin"}. Manage users, mentor allocation, and platform-wide settings.`}
            </p>
          </div>
          {showActions && (
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-xl border border-brand-sand bg-white px-3.5 py-2 text-xs font-bold text-brand-deep shadow-xs">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-approved" />
                <span>Full Access</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
