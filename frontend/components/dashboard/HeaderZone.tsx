"use client";

import { useTeam } from "./TeamProvider";
import InteractiveTeamAvatar from "./InteractiveTeamAvatar";

export default function HeaderZone() {
  const { filledCount, invites, teamName, teamCode, capacity, teamId } = useTeam();
  const confirmedCount = filledCount;
  const pendingCount = invites.length;

  return (
    <div className="space-y-4">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <InteractiveTeamAvatar teamName={teamName} teamId={teamId ?? undefined} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-extrabold text-brand-deep sm:text-xl">{teamName}</span>
              <span className="rounded-md border border-brand-softline bg-[#FAF7F2] px-2 py-0.5 font-mono text-xs font-medium text-brand-muted">
                ID: {teamCode}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col justify-center">
          <span className="text-xs font-bold tracking-tight text-brand-deep">Roster Capacity</span>

          <div className="mt-2 flex w-44 items-center gap-1.5 sm:w-56">
            {Array.from({ length: capacity }).map((_, idx) => {
              const isFilled = idx < confirmedCount;
              const isPending = !isFilled && idx < confirmedCount + pendingCount;

              return (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    isFilled
                      ? "bg-[#C25E26]"
                      : isPending
                        ? "animate-pulse bg-amber-300"
                        : "bg-brand-softline/60"
                  }`}
                  title={`Slot ${idx + 1}: ${
                    isFilled ? "Confirmed" : isPending ? "Pending Invite" : "Open Slot"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
      </div>
  );
}