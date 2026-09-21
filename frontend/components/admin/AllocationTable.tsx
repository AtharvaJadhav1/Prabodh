"use client";

import { useMemo, useState } from "react";
import type { AdminAllocation } from "../../data/adminDashboard";
import { useAdmin } from "./AdminProvider";
import MentorDropdown from "./MentorDropdown";
import { CheckIcon, SearchIcon, AlertCircleIcon } from "../dashboard/icons";

type Props = {
  allocations: AdminAllocation[];
  onAssignInstitute: (teamId: string, mentorId: string) => void;
  onAssignIndustry: (teamId: string, mentorId: string) => void;
};

export default function AllocationTable({ allocations, onAssignInstitute, onAssignIndustry }: Props) {
  const { mentors, industryMentorOptions } = useAdmin();
  const [search, setSearch] = useState("");

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
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((a) => {
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
                    <MentorDropdown
                      options={mentors.map((m) => ({ id: m.id, name: m.name, subtext: m.title }))}
                      selectedId={a.assignedMentorId ?? undefined}
                      placeholder="Select Institute Mentor..."
                      onSelect={(id) => onAssignInstitute(a.teamId, id)}
                    />
                  </td>
                  <td className="min-w-[190px] px-4 py-4">
                    <MentorDropdown
                      options={industryMentorOptions.map((m) => ({ id: m.id, name: m.name, subtext: m.title }))}
                      selectedId={a.assignedIndustryMentorId ?? undefined}
                      placeholder="Select Industrial Mentor..."
                      onSelect={(id) => onAssignIndustry(a.teamId, id)}
                    />
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