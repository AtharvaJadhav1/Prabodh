"use client";

import { useState, useMemo } from "react";
import type { AdminAllocation } from "../../data/adminDashboard";
import { useAdmin } from "./AdminProvider";
import { CheckIcon, SearchIcon, AlertCircleIcon } from "../dashboard/icons";

type PendingChanges = Record<string, { institute?: string; industry?: string }>;

type Props = {
  allocations: AdminAllocation[];
  onAssignInstitute: (teamId: string, mentorId: string) => void;
  onAssignIndustry: (teamId: string, mentorId: string) => void;
};

export default function AllocationTable({ allocations, onAssignInstitute, onAssignIndustry }: Props) {
  const { mentors, industryMentorOptions } = useAdmin();
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return allocations;
    const q = search.toLowerCase();
    return allocations.filter((a) => a.teamName.toLowerCase().includes(q) || a.teamId.toLowerCase().includes(q));
  }, [allocations, search]);

  const setPending = (teamId: string, kind: "institute" | "industry", value: string) => {
    setPendingChanges((prev) => ({ ...prev, [teamId]: { ...prev[teamId], [kind]: value } }));
  };

  const handleSave = (a: AdminAllocation) => {
    const pending = pendingChanges[a.teamId];
    if (!pending) return;
    if (pending.institute && pending.institute !== a.assignedMentorId) {
      onAssignInstitute(a.teamId, pending.institute);
    }
    if (pending.industry && pending.industry !== a.assignedIndustryMentorId) {
      onAssignIndustry(a.teamId, pending.industry);
    }
    setPendingChanges((prev) => {
      const next = { ...prev };
      delete next[a.teamId];
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 pb-6 border-b border-brand-sand lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-brand-deep">Mentor Allocation</h2>
          <p className="mt-0.5 text-xs font-medium text-brand-muted">
            Assign or reassign Institute and Industrial mentors to hackathon teams.
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
              <th className="px-4 py-3 font-bold">Institute Mentor</th>
              <th className="px-4 py-3 font-bold">Industrial Mentor</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((a) => {
              const pending = pendingChanges[a.teamId];
              const institute = pending?.institute ?? a.assignedMentorId ?? "";
              const industry = pending?.industry ?? a.assignedIndustryMentorId ?? "";
              const hasPending = Boolean(pending?.institute || pending?.industry);
              const bothAssigned = Boolean(a.assignedMentorId && a.assignedIndustryMentorId);
              return (
                <tr key={a.teamId} className="transition-colors hover:bg-brand-cream/80">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-brand-deep">{a.teamName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-brand-muted">{a.teamId}</div>
                  </td>
                  <td className="px-4 py-4 text-brand-charcoal">{a.track}</td>
                  <td className="px-4 py-4 text-center">
                    {bothAssigned ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                        <CheckIcon className="h-3 w-3" />
                        Paid
                      </span>
                    ) : a.assignedMentorId || a.assignedIndustryMentorId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                        Partial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-overdue/20 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-brand-overdue">
                        <AlertCircleIcon className="h-3 w-3" />
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="min-w-[190px] px-4 py-4">
                    <select
                      value={institute}
                      onChange={(e) => setPending(a.teamId, "institute", e.target.value)}
                      className="w-full rounded-xl border border-brand-sand bg-white px-3 py-1.5 text-xs font-medium text-brand-deep transition focus:border-brand-primary focus:outline-none"
                    >
                      <option value="">Select Institute Mentor...</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="min-w-[190px] px-4 py-4">
                    <select
                      value={industry}
                      onChange={(e) => setPending(a.teamId, "industry", e.target.value)}
                      className="w-full rounded-xl border border-brand-sand bg-white px-3 py-1.5 text-xs font-medium text-brand-deep transition focus:border-brand-primary focus:outline-none"
                    >
                      <option value="">Select Industrial Mentor...</option>
                      {industryMentorOptions.map((m) => (
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
                        onClick={() => handleSave(a)}
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