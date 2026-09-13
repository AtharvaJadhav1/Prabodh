"use client";

import { useTeam } from "./TeamProvider";
import { UsersRoundIcon } from "./icons";

export default function HeaderZone() {
  const { filledCount, teamName, teamCode, capacity } = useTeam();
  const percent = Math.round((filledCount / Math.max(capacity, 1)) * 100);

  return (
    <div className="space-y-4">
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