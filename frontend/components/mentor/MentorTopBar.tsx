"use client";

import NotificationBell from "../chrome/NotificationBell";
import { useAuth } from "../auth/AuthProvider";
import {
  ChevronRightIcon,
  CalendarIcon,
  AwardIcon,
  FileSpreadsheetIcon,
} from "../dashboard/icons";

type BreadcrumbSegment = { label: string; href?: string };

export type MentorTopBarProps = {
  onMenuClick: () => void;
  breadcrumb?: BreadcrumbSegment[];
  title?: string;
  subtitle?: string;
  showActions?: boolean;
};

export default function MentorTopBar({
  onMenuClick,
  breadcrumb,
  title,
  subtitle,
  showActions = true,
}: MentorTopBarProps) {
  const { session } = useAuth();
  const crumbs: BreadcrumbSegment[] = breadcrumb ?? [
    { label: "SIH 2026 Portal" },
    { label: "Faculty & Mentorship" },
    { label: "Assigned Groups" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-brand-sand bg-brand-cream/95 backdrop-blur-md">
      <div className="p-6 pb-2">
        {/* Mobile hamburger + breadcrumb + status */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
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
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-sand bg-white px-3 py-1 text-xs font-medium text-brand-deep">
                  <CalendarIcon className="h-3.5 w-3.5 text-brand-primary" />
                  Internal Gate Qualifier
                </span>
              </>
            )}
            <NotificationBell />
          </div>
        </div>

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 mb-6">
          <div className="leading-tight">
            <h1 className="text-2xl font-bold tracking-tight text-brand-deep leading-tight">
              {title ?? "Mentor Evaluation Hub"}
            </h1>
            <p className="mt-0.5 text-xs text-brand-muted leading-tight">
              {subtitle ?? `Welcome, ${session?.fullName ?? "mentor"}. Monitor assigned student cohorts and record official rubric scores.`}
            </p>
          </div>
          {showActions && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-sand bg-white px-3.5 text-xs font-bold text-brand-deep shadow-xs transition-colors hover:bg-brand-cream"
              >
                <FileSpreadsheetIcon className="h-3.5 w-3.5 text-brand-muted" />
                <span>Roster CSV</span>
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
              >
                <AwardIcon className="h-3.5 w-3.5" />
                <span>Bulk Scoring Matrix</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
