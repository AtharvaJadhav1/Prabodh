"use client";

import { useTeam } from "../TeamProvider";
import { ShieldCheckIcon, LockIcon } from "../icons";

export default function LockedBanner() {
  const { team, role } = useTeam();
  const idea = team?.ideaSubmissions?.[0];
  const locked = idea?.status === "locked" || Boolean(team?.problemStatement);
  const hasTeam = Boolean(team?.id) && role !== "NO_TEAM";

  if (!locked) {
    return (
      <div className="rounded-2xl border border-brand-softline bg-white p-4 text-sm text-brand-muted">
        {hasTeam
          ? "No problem statement is locked yet. Rank your preferences below and submit them for mentor review."
          : "No problem statement is locked yet. Browse the catalog below — you'll need a team before you can rank preferences."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-approved/20 bg-brand-approved/5 p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-approved/10 text-brand-approved">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-base font-bold leading-snug text-brand-approved">Problem statement selected</h2>
            <p className="mt-0.5 max-w-2xl break-words text-sm text-brand-approved/85">
              {team?.problemStatement?.code ?? idea?.problemStatement?.code} is attached to this team.
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-brand-approved px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm md:self-auto">
          <LockIcon className="h-4 w-4" />
          {idea?.status ?? "selected"}
        </div>
      </div>
    </div>
  );
}
