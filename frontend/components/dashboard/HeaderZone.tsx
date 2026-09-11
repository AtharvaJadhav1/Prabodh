"use client";

import { useTeam } from "./TeamProvider";
import {
  ShieldCheckIcon,
  UserCheckIcon,
  UsersRoundIcon,
  CheckIcon,
  ChevronRightIcon,
  SparklesIcon,
  EyeIcon,
} from "./icons";

export default function HeaderZone() {
  const { filledCount, pendingRequestCount, isLead, teamName, teamCode, capacity } = useTeam();
  const percent = Math.round((filledCount / Math.max(capacity, 1)) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-deep">
              Team Formation &amp; Group Requests
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-softline bg-brand-knowledge px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
              {isLead ? (
                <>
                  <UserCheckIcon className="h-3 w-3 text-brand-primary" />
                  Leader Mode
                </>
              ) : (
                <>
                  <EyeIcon className="h-3 w-3 text-brand-primary" />
                  Member Read-Only Mode
                </>
              )}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-charcoal/75">
            Manage team roster, send institutional email invitations, and review incoming requests.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex flex-wrap items-center gap-1 text-xs text-brand-muted">
            <span className="transition-colors hover:text-brand-primary">SIH 2026 Student Portal</span>
            <ChevronRightIcon className="h-3.5 w-3.5" />
            <span className="font-semibold text-brand-deep">Team <span className="font-mono">{teamCode}</span></span>
            <ChevronRightIcon className="h-3.5 w-3.5" />
            <span className="font-semibold text-brand-primary">Team Formation &amp; Group Requests</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1 text-xs font-semibold text-brand-approved">
            Stage 1: Idea Submission Active
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-softline bg-white px-3 py-1 text-xs font-medium text-brand-deep shadow-sm">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-approved" />
            College SPOC Verified Track
          </span>
        </div>
      </div>

      <div className="flex items-center self-center shrink-0 rounded-2xl border border-brand-softline bg-white p-3 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
          <UsersRoundIcon className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <div className="text-xs font-medium text-brand-muted">Mandatory Squad Size</div>
          <div className="text-sm font-bold text-brand-deep">Team size cap: {capacity} members</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-deep text-lg font-extrabold uppercase text-brand-cream shadow-inner">
              {teamName.slice(0, 2).toUpperCase() || "—"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-extrabold text-brand-deep">{teamName}</span>
                <span className="rounded border border-brand-softline bg-brand-knowledge px-2 py-0.5 font-mono text-xs font-semibold text-brand-charcoal/80">
                  ID: {teamCode}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-brand-muted">
                <span>Live roster from the platform</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-brand-deep">
                Roster Capacity Meter:
                <span className="ml-1 font-bold text-brand-primary">
                  {filledCount} / {capacity} Members Finalized
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-brand-muted">
                {capacity - filledCount} Open Slots Remaining
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-amber" />
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-amber shadow-sm transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-2 grid grid-cols-6 gap-1 font-mono text-center text-[10px]">
              {Array.from({ length: capacity }).map((_, i) => {
                const slotIndex = i + 1;
                const filled = slotIndex <= filledCount;
                const pending = !filled && slotIndex === filledCount + 1;
                return (
                  <span
                    key={slotIndex}
                    className={
                      filled
                        ? "font-bold text-brand-approved"
                        : pending
                          ? "rounded bg-brand-amber/20 py-0.5 font-semibold text-brand-deep"
                          : "rounded bg-brand-softline/50 py-0.5 font-semibold text-brand-primary"
                    }
                  >
                    Slot {slotIndex} {filled ? "✓" : "(Open)"}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
  );
}