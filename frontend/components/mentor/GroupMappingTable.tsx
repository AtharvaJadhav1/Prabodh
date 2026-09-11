"use client";

import { useState, useMemo } from "react";
import type { MentorGroup, IndustryMentor } from "../../data/mentorDashboard";
import { CheckIcon, SearchIcon } from "../dashboard/icons";

type AssignmentMap = Record<string, string>;

type Props = {
  groups: MentorGroup[];
  mentors: IndustryMentor[];
  assignments: AssignmentMap;
  onAssign: (teamId: string, mentorId: string) => void;
};

type FilterMode = "all" | "unassigned" | "assigned";

export default function GroupMappingTable({
  groups,
  mentors,
  assignments,
  onAssign,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [pendingChanges, setPendingChanges] = useState<AssignmentMap>({});

  const effectiveAssignments = useMemo(() => {
    return { ...assignments, ...pendingChanges };
  }, [assignments, pendingChanges]);

  const filtered = useMemo(() => {
    let list = groups;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.teamName.toLowerCase().includes(q) ||
          g.teamId.toLowerCase().includes(q) ||
          g.problemTitle.toLowerCase().includes(q),
      );
    }

    if (filter === "unassigned") {
      list = list.filter((g) => !effectiveAssignments[g.teamId]);
    } else if (filter === "assigned") {
      list = list.filter((g) => !!effectiveAssignments[g.teamId]);
    }

    return list;
  }, [groups, search, filter, effectiveAssignments]);

  const totalAssigned = Object.keys(effectiveAssignments).length;

  const getMentorName = (mentorId: string) => {
    const m = mentors.find((x) => x.id === mentorId);
    return m ? `${m.name} (${m.company})` : mentorId;
  };

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6 border-b border-brand-sand lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-deep font-bold text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-brand-deep">Assign Groups</h2>
              <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                {totalAssigned} of {groups.length} groups mapped to Industry Mentors
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-brand-muted">
              Link external domain experts to guide teams on feasibility, scalable stack, and investor pitch.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search group, team name, PS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-brand-sand bg-brand-cream py-2 pl-9 pr-3 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
            />
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
            className="rounded-xl border border-brand-sand bg-brand-cream px-3 py-2 text-xs font-medium text-brand-charcoal transition focus:border-brand-primary focus:outline-none"
          >
            <option value="all">All Groups ({groups.length})</option>
            <option value="unassigned">Unassigned Only ({groups.length - totalAssigned})</option>
            <option value="assigned">Mapped to Mentor ({totalAssigned})</option>
          </select>

          <button
            type="button"
            title="Refresh Mapping Status"
            onClick={() => setPendingChanges({})}
            className="rounded-xl border border-brand-sand bg-brand-cream p-2 text-brand-deep transition-colors hover:text-brand-primary hover:bg-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60 text-[10px] uppercase tracking-wider text-brand-muted">
              <th className="px-4 py-3 font-bold">Group &amp; Team</th>
              <th className="px-4 py-3 font-bold">Project &amp; Domain</th>
              <th className="px-4 py-3 text-center font-bold">Current Status</th>
              <th className="px-4 py-3 font-bold">Assign To (Industry Mentor)</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((group) => {
              const assignedMentor = effectiveAssignments[group.teamId] ?? "";
              const hasPending = group.teamId in pendingChanges;

              return (
                <tr key={group.teamId} className="transition-colors hover:bg-brand-cream/80">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-brand-deep">{group.teamName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-brand-muted">{group.teamId}</div>
                    <span className="mt-1 inline-block rounded border border-brand-sand bg-brand-cream px-2 py-0.5 text-[10px] text-brand-muted">
                      {group.capacity} &middot; {group.track.split(" / ")[0]}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <div className="line-clamp-1 text-xs font-semibold text-brand-charcoal">
                      {group.problemTitle}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {group.domains.map((d) => (
                        <span
                          key={d}
                          className="rounded border border-brand-sand bg-brand-cream px-2 py-0.5 text-[10px] font-semibold text-brand-charcoal"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {assignedMentor ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                        <CheckIcon className="h-3 w-3" />
                        Mapped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                        Not Assigned
                      </span>
                    )}
                  </td>
                  <td className="min-w-[220px] px-4 py-4">
                    <select
                      value={assignedMentor}
                      onChange={(e) =>
                        setPendingChanges((prev) => ({
                          ...prev,
                          [group.teamId]: e.target.value,
                        }))
                      }
                      className={`w-full rounded-xl border px-3 py-1.5 text-xs font-medium transition focus:border-brand-primary focus:outline-none ${
                        assignedMentor
                          ? "border-brand-approved/40 bg-white text-brand-deep font-semibold"
                          : "border-brand-sand bg-brand-cream text-brand-charcoal"
                      }`}
                    >
                      <option value="">Select Industry Mentor...</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.company})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {hasPending ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAssign(group.teamId, pendingChanges[group.teamId] ?? "");
                          setPendingChanges((prev) => {
                            const next = { ...prev };
                            delete next[group.teamId];
                            return next;
                          });
                        }}
                        className="rounded-lg bg-brand-deep px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-deep/90 active:scale-95"
                      >
                        Save / Assign
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-brand-sand bg-brand-cream px-4 py-1.5 text-xs font-bold text-brand-muted shadow-xs"
                      >
                        {assignedMentor ? "Update" : "Assign"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs font-medium text-brand-muted">
                  No groups match &ldquo;{search || filter}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-brand-sand pt-4 text-xs text-brand-muted">
        <p>
          Showing {filtered.length} of {groups.length} Assigned Hackathon Cohorts
        </p>
      </div>
    </section>
  );
}
