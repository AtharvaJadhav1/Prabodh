"use client";

import Link from "next/link";
import IndustryShell from "../../../components/industry/IndustryShell";
import MetricCards from "../../../components/industry/MetricCards";
import { useIndustryMentor } from "../../../components/industry/IndustryMentorProvider";

export default function IndustryOverviewPage() {
  const { pendingInvites, acceptedMentors, visibleTeams } = useIndustryMentor();

  return (
    <IndustryShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Industry Mentorship" }, { label: "Overview" }]}
      title="Industry Mentor Overview"
    >
      <MetricCards
        pendingCount={pendingInvites.length}
        acceptedMentorCount={acceptedMentors.length}
        visibleTeamCount={visibleTeams.length}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">Pending Invites</h2>
            <Link href="/dashboard/industry/invites" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              View all &rarr;
            </Link>
          </div>
          {pendingInvites.length === 0 ? (
            <p className="text-xs font-medium text-brand-muted">No pending invites right now.</p>
          ) : (
            <div className="space-y-3">
              {pendingInvites.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-brand-sand bg-brand-cream p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                      {inv.instituteMentorInitials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-deep">{inv.instituteMentorName}</p>
                      <p className="text-[11px] text-brand-muted">{inv.groupIds.length} team(s)</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-brand-muted">{inv.invitedAt}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">My Institute Mentors</h2>
            <Link href="/dashboard/industry/mentors" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              View all &rarr;
            </Link>
          </div>
          {acceptedMentors.length === 0 ? (
            <p className="text-xs font-medium text-brand-muted">Accept an invite to see mentors here.</p>
          ) : (
            <div className="space-y-3">
              {acceptedMentors.slice(0, 3).map((m) => (
                <div key={m.instituteMentorId} className="flex items-center justify-between rounded-xl border border-brand-sand bg-brand-cream p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                      {m.instituteMentorInitials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-deep">{m.instituteMentorName}</p>
                      <p className="text-[11px] text-brand-muted">{m.instituteMentorTitle}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-approved">{m.groupIds.length} teams</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </IndustryShell>
  );
}
