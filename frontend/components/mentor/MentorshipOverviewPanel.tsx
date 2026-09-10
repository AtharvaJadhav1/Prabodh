"use client";

import { useMentorProfile } from "./MentorProfileProvider";
import {
  UsersRoundIcon,
  ClockIcon,
  GradCapIcon,
  CheckIcon,
  AlertCircleIcon,
  ZapIcon,
  ArrowRightIcon,
  PencilIcon,
} from "../dashboard/icons";

export default function MentorshipOverviewPanel() {
  const { profile, openDrawer } = useMentorProfile();
  const { stats, nextAction, cohorts } = profile;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Assigned Teams */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Assigned Teams</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
              <UsersRoundIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-deep">{stats.assignedTeams}</span>
              <span className="text-xs font-semibold text-brand-muted">{stats.teamsLabel}</span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-approved">
              <CheckIcon className="h-3.5 w-3.5" />
              100% Slot Capacity
            </p>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Pending Reviews</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF3E9] text-brand-amber">
              <ClockIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-amber">{stats.pendingReviews}</span>
              <span className="text-xs font-semibold text-brand-muted">{stats.reviewsLabel}</span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-primary">
              <AlertCircleIcon className="h-3.5 w-3.5" />
              Due by Sept 15
            </p>
          </div>
        </div>

        {/* Students Guided */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Students Guided</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-sand bg-brand-cream text-brand-deep">
              <GradCapIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-deep">{stats.studentsGuided}</span>
              <span className="text-xs font-semibold text-brand-muted">{stats.studentsLabel}</span>
            </div>
            <p className="mt-2 text-xs text-brand-muted">Across {stats.tracksCount} Problem Tracks</p>
          </div>
        </div>
      </div>

      {/* Next Action Banner */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-brand-sand bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-lightOrange text-brand-primary">
            <ZapIcon className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-brand-charcoal">
            <strong className="font-bold text-brand-deep">Next Action:</strong> {nextAction}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openDrawer("overview")}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-sand px-3.5 py-1.5 text-xs font-semibold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit Overview
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-deep px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#7E3B14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          Jump to Reviews
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Assigned Cohorts Table */}
      <div className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-sand pb-4">
          <div>
            <h3 className="text-base font-bold text-brand-deep">Assigned Cohorts &amp; Domain Highlights</h3>
            <p className="mt-0.5 text-xs text-brand-muted">Current hackathon teams under Dr. Singh&apos;s guidance</p>
          </div>
          <span className="rounded-lg bg-brand-lightOrange px-2.5 py-1 text-xs font-semibold text-brand-primary">
            Cycle 2026
          </span>
        </div>
        <div className="divide-y divide-brand-sand/60 mt-2">
          {cohorts.map((cohort) => (
            <div key={cohort.teamName} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-brand-deep">
                  Team {cohort.teamName} &bull; Problem {cohort.problemCode}
                </p>
                <p className="text-xs text-brand-muted">{cohort.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    cohort.status === "approved"
                      ? "border border-brand-approved/20 bg-brand-approved/10 text-brand-approved"
                      : "border border-brand-primary/20 bg-brand-lightOrange text-brand-primary"
                  }`}
                >
                  {cohort.status === "approved" ? "Review Approved" : "Review Pending"}
                </span>
                <span className="text-xs text-brand-muted">{cohort.members} Members</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
