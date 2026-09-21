"use client";

import Link from "next/link";
import { useIndustryProfile } from "./IndustryProfileProvider";
import { UsersRoundIcon, MailIcon, ZapIcon, ArrowRightIcon } from "../dashboard/icons";

export default function IndustryOverviewPanel() {
  const { stats } = useIndustryProfile();
  const { pendingCount, cohorts } = stats;

  return (
    <div className="space-y-6">
      {/* Quick Action Banner */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-brand-sand bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-lightOrange text-brand-primary">
            <ZapIcon className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-brand-charcoal">
            <strong className="font-bold text-brand-deep">Current Status:</strong> Open to Industry Mentorship
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="rounded-full bg-brand-lightOrange px-2.5 py-1 text-xs font-semibold text-brand-primary">
              {pendingCount} pending invite{pendingCount === 1 ? "" : "s"}
            </span>
          ) : null}
          <Link
            href="/dashboard/industry/invites"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-deep px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#7E3B14]"
          >
            View Team Queries
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Assigned Cohorts & Industry Track */}
      <div className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-sand pb-4">
          <div>
            <h3 className="text-base font-bold text-brand-deep">Assigned Cohorts &amp; Domain Highlights</h3>
            <p className="mt-0.5 text-xs text-brand-muted">Student teams currently linked to you as an industry mentor</p>
          </div>
          <span className="rounded-lg bg-brand-lightOrange px-2.5 py-1 text-xs font-semibold text-brand-primary">
            Industry Track
          </span>
        </div>

        {cohorts.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-muted shadow-sm">
              <UsersRoundIcon className="h-6 w-6" />
            </div>
            <p className="mx-auto mt-3 max-w-sm text-sm font-semibold text-brand-deep">No teams currently linked</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-brand-muted">
              Faculty mentors or administrators will invite you to domain-relevant teams.
            </p>
          </div>
        ) : (
          <div className="mt-2 divide-y divide-brand-sand/60">
            {cohorts.map((cohort) => (
              <div key={cohort.teamId} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-brand-deep">
                    Team {cohort.teamName} &bull; Problem {cohort.problemCode}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-brand-muted">
                    {cohort.problemTitle} &middot; {cohort.track}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-brand-muted">
                    <span>{cohort.capacity} members</span>
                    <span className="flex items-center gap-1">
                      <MailIcon className="h-3 w-3 text-brand-primary" />
                      {cohort.leader}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-0.5 text-xs font-semibold text-brand-approved">
                    {cohort.milestone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}