"use client";

import { useState, useMemo } from "react";
import type { AdminAllocation } from "../../data/adminDashboard";
import { availableMentors } from "../../data/adminDashboard";
import { CheckIcon, SearchIcon } from "../dashboard/icons";

type Props = {
  allocations: AdminAllocation[];
  onAssign: (teamId: string, mentorId: string) => void;
};

export default function AllocationTable({ allocations, onAssign }: Props) {
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return allocations;
    const q = search.toLowerCase();
    return allocations.filter((a) => a.teamName.toLowerCase().includes(q) || a.teamId.toLowerCase().includes(q));
  }, [allocations, search]);

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 pb-6 border-b border-brand-sand lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-brand-deep">Mentor Allocation</h2>
          <p className="mt-0.5 text-xs font-medium text-brand-muted">
            Assign or reassign Institute Mentors to hackathon teams.
          </p>
        </div>
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-sand bg-brand-cream py-2 pl-9 pr-3 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60 text-[10px] uppercase tracking-wider text-brand-muted">
              <th className="px-4 py-3 font-bold">Team</th>
              <th className="px-4 py-3 font-bold">Track</th>
              <th className="px-4 py-3 text-center font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Assign To</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((a) => {
              const assigned = pendingChanges[a.teamId] ?? a.assignedMentorId ?? "";
              const hasPending = a.teamId in pendingChanges;
              return (
                <tr key={a.teamId} className="transition-colors hover:bg-brand-cream/80">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-brand-deep">{a.teamName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-brand-muted">{a.teamId}</div>
                  </td>
                  <td className="px-4 py-4 text-brand-charcoal">{a.track}</td>
                  <td className="px-4 py-4 text-center">
                    {a.status === "assigned" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                        <CheckIcon className="h-3 w-3" />
                        Assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="min-w-[200px] px-4 py-4">
                    <select
                      value={assigned}
                      onChange={(e) => setPendingChanges((prev) => ({ ...prev, [a.teamId]: e.target.value }))}
                      className="w-full rounded-xl border border-brand-sand bg-white px-3 py-1.5 text-xs font-medium text-brand-deep transition focus:border-brand-primary focus:outline-none"
                    >
                      <option value="">Select Mentor...</option>
                      {availableMentors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {hasPending ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAssign(a.teamId, pendingChanges[a.teamId] ?? "");
                          setPendingChanges((prev) => {
                            const next = { ...prev };
                            delete next[a.teamId];
                            return next;
                          });
                        }}
                        className="rounded-lg bg-brand-deep px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-deep/90 active:scale-95"
                      >
                        Save
                      </button>
                    ) : (
                      <button type="button" disabled className="rounded-lg border border-brand-sand bg-brand-cream px-4 py-1.5 text-xs font-bold text-brand-muted">
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
