"use client";

import { useState, useMemo } from "react";
import type { MentorGroup } from "../../data/mentorDashboard";
import type { MentorInvite } from "../../data/industryDashboard";
import { SearchIcon } from "../dashboard/icons";

type Props = {
  groups: MentorGroup[];
  teamMentors: (teamId: string) => MentorInvite[];
};

export default function AssignedTeamsTable({ groups, teamMentors }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.teamName.toLowerCase().includes(q) ||
        g.teamId.toLowerCase().includes(q) ||
        g.problemTitle.toLowerCase().includes(q),
    );
  }, [groups, search]);

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 pb-6 border-b border-brand-sand lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-deep font-bold text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-deep">Assigned Teams</h2>
            <p className="mt-0.5 text-xs font-medium text-brand-muted">
              Teams shared by your accepted Institute Mentors.
            </p>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search team, PS..."
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
              <th className="px-4 py-3 font-bold">Group &amp; Team</th>
              <th className="px-4 py-3 font-bold">Project &amp; Domain</th>
              <th className="px-4 py-3 font-bold">Via Institute Mentor(s)</th>
              <th className="px-4 py-3 text-center font-bold">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((group) => {
              const mentors = teamMentors(group.teamId);
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
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {mentors.map((m) => (
                        <span
                          key={m.instituteMentorId}
                          className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary"
                        >
                          {m.instituteMentorName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {group.score !== undefined ? (
                      <span className="rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                        {group.score} / {group.grade}
                      </span>
                    ) : (
                      <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                        Not Scored
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-xs font-medium text-brand-muted">
                  No teams match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
