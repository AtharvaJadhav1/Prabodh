"use client";

import Link from "next/link";
import IndustryShell from "../../../components/industry/IndustryShell";
import MetricCards from "../../../components/industry/MetricCards";
import { ErrorBanner, SkeletonRows } from "../../../components/industry/LoadState";
import { useIndustryMentor } from "../../../components/industry/IndustryMentorProvider";
import { initials } from "../../../lib/initials";

export default function IndustryOverviewPage() {
  const { pendingInvites, acceptedMentors, allTeams: visibleTeams, isLoading, error, reload } = useIndustryMentor();

  return (
    <IndustryShell title="Industry Mentor Workspace">
      {error ? <ErrorBanner className="mb-4" message={error} onRetry={() => void reload()} /> : null}
      <MetricCards
        pendingCount={pendingInvites.length}
        acceptedMentorCount={acceptedMentors.length}
        visibleTeamCount={visibleTeams.length}
        loading={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">Pending Invites</h2>
            <Link href="/dashboard/industry/invites" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              View all &rarr;
            </Link>
          </div>
          {isLoading ? (
            <SkeletonRows rows={2} label="Loading pending invites…" />
          ) : pendingInvites.length === 0 ? (
            <p className="text-xs font-medium text-brand-muted">
              {error ? "Pending invites could not be loaded." : "No pending invites right now."}
            </p>
          ) : (
            <div className="space-y-3">
              {pendingInvites.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-sand bg-brand-cream p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                      {initials(inv.invitedByName ?? inv.teamName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-brand-deep">{inv.teamName}</p>
                      <p className="truncate text-[11px] text-brand-muted">
                        {inv.invitedByName ? `Invited by ${inv.invitedByName} · ` : ""}
                        {inv.teamCode}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-brand-muted">{inv.invitedAt}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">My Institute Mentors</h2>
            <Link href="/dashboard/industry/mentors" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              View all &rarr;
            </Link>
          </div>
          {isLoading ? (
            <SkeletonRows rows={2} label="Loading institute mentors…" />
          ) : acceptedMentors.length === 0 ? (
            <p className="text-xs font-medium text-brand-muted">
              {error ? "Institute mentors could not be loaded." : "Accept an invite to see mentors here."}
            </p>
          ) : (
            <div className="space-y-3">
              {acceptedMentors.slice(0, 3).map((m) => (
                <div key={m.instituteMentorId} className="flex items-center justify-between gap-3 rounded-xl border border-brand-sand bg-brand-cream p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                      {m.instituteMentorInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-brand-deep">{m.instituteMentorName}</p>
                      <p className="truncate text-[11px] text-brand-muted">{m.instituteMentorTitle}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-brand-approved">
                    {m.groupIds.length} team{m.groupIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </IndustryShell>
  );
}
