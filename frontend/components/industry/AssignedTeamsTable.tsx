"use client";

import { useState, useMemo } from "react";
import type { MentorGroup } from "../../data/mentorDashboard";
import Link from "next/link";
import type { AcceptedMentor } from "./IndustryMentorProvider";
import { SearchIcon } from "../dashboard/icons";

type Props = {
  groups: MentorGroup[];
  /** Count of every assigned team before the mentor filter; 0 means the mentor truly has no teams. */
  totalTeams?: number;
  teamMentors: (teamCode: string) => AcceptedMentor[];
};

export default function AssignedTeamsTable({ groups, totalTeams, teamMentors }: Props) {
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
    <section className="rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm">
      <div className="flex flex-col gap-4 pb-6 border-b border-brand-sand lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-deep font-bold text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-base font-bold text-brand-deep">Assigned Teams</h2>
            <p className="mt-0.5 text-xs font-medium text-brand-muted">
              Teams shared by your accepted Institute Mentors.
            </p>
          </div>
        </div>

        <div className="relative min-w-[240px] max-sm:w-full max-sm:min-w-0">
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
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60 text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-4 py-3 font-bold">Group &amp; Team</th>
              <th className="px-4 py-3 font-bold">Project &amp; Domain</th>
              <th className="px-4 py-3 font-bold">Via Institute Mentor(s)</th>
              <th className="px-4 py-3 text-center font-bold">Score</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((group) => {
              const mentors = teamMentors(group.teamId);
              return (
                <tr key={group.id ?? group.teamId} className="transition-colors hover:bg-brand-cream/80">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-brand-deep">{group.teamName}</div>
                    <div className="mt-0.5 font-mono text-xs text-brand-muted">{group.teamId}</div>
                    <span className="mt-1 inline-block rounded border border-brand-sand bg-brand-cream px-2 py-0.5 text-xs text-brand-muted">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"} &middot; {group.track.split(" / ")[0]}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <div className="line-clamp-1 text-xs font-semibold text-brand-charcoal">
                      {group.problemTitle}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {group.domains.map((d) => (
                        <span
                          key={d}
                          className="rounded border border-brand-sand bg-brand-cream px-2 py-0.5 text-xs font-semibold text-brand-charcoal"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {mentors.length === 0 ? <span className="text-brand-muted">—</span> : null}
                      {mentors.map((m) => (
                        <span
                          key={m.instituteMentorId}
                          title={m.instituteMentorTitle}
                          className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-xs font-semibold text-brand-primary"
                        >
                          {m.instituteMentorName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {group.score !== undefined ? (
                      <span className="rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-xs font-semibold text-brand-approved whitespace-nowrap">
                        {group.score} / {group.grade}
                      </span>
                    ) : (
                      <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-xs font-semibold text-brand-primary whitespace-nowrap">
                        Not Scored
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {group.id ? (
                      <Link
                        href={`/dashboard/industry/teams/${group.id}`}
                        className="inline-flex items-center rounded-lg border border-brand-primary/30 bg-brand-lightOrange px-3 py-1.5 text-xs font-bold text-brand-primary whitespace-nowrap transition-colors hover:bg-brand-primary hover:text-white"
                      >
                        View Team
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-xs font-medium text-brand-muted">
                  {search.trim()
                    ? <>No teams match &ldquo;{search}&rdquo;.</>
                    : (totalTeams ?? groups.length) === 0
                      ? "No teams assigned yet. Accept an invite to see teams."
                      : "No teams are shared by the selected mentors."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
