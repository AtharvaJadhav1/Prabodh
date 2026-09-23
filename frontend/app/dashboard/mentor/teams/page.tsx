"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MentorShell from "../../../../components/mentor/MentorShell";
import EmptyState from "../../../../components/mentor/EmptyState";
import LoadingState from "../../../../components/LoadingState";
import Avatar from "../../../../components/Avatar";
import { useMentorTeams } from "../../../../components/mentor/MentorTeamsProvider";
import { SearchIcon, UsersIcon, ChevronRightIcon } from "../../../../components/dashboard/icons";

type PsFilter = "all" | "awaiting" | "locked";

const COL_SIZES = {
  team: "w-[20%] min-w-[200px]",
  leader: "w-[22%] min-w-[210px]",
  ps: "w-[34%] min-w-[260px]",
  members: "w-[9%] min-w-[90px]",
  score: "w-[11%] min-w-[100px]",
  chevron: "w-[4%] min-w-[36px]",
} as const;

function psStatusOf(row: {
  pendingInvite?: boolean;
  team: {
    problemStatement?: unknown;
    psPreferences?: Array<{ status: string }>;
  };
}): "pending" | "locked" | "awaiting" | "none" {
  if (row.pendingInvite) return "pending";
  if (row.team.problemStatement) return "locked";
  if ((row.team.psPreferences ?? []).some((p) => p.status === "submitted")) return "awaiting";
  return "none";
}

export default function MentorTeamsPage() {
  const router = useRouter();
  const { teams, loading, error } = useMentorTeams();
  const [search, setSearch] = useState("");
  const [psFilter, setPsFilter] = useState<PsFilter>("all");

  const rows = useMemo(() => teams.map((row) => ({ row, psStatus: psStatusOf(row) })), [teams]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      awaiting: rows.filter((r) => r.psStatus === "awaiting").length,
      locked: rows.filter((r) => r.psStatus === "locked").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ row, psStatus }) => {
      if (psFilter === "awaiting" && psStatus !== "awaiting") return false;
      if (psFilter === "locked" && psStatus !== "locked") return false;
      if (!q) return true;
      const ps = row.team.problemStatement;
      return (
        row.team.name.toLowerCase().includes(q) ||
        row.team.teamCode.toLowerCase().includes(q) ||
        (row.team.theme ?? "").toLowerCase().includes(q) ||
        (row.team.leader?.fullName ?? "").toLowerCase().includes(q) ||
        (row.team.leader?.email ?? "").toLowerCase().includes(q) ||
        (ps?.code ?? "").toLowerCase().includes(q) ||
        (ps?.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, psFilter]);

  const filters: Array<{ key: PsFilter; label: string }> = [
    { key: "all", label: `All (${counts.all})` },
    { key: "awaiting", label: `Awaiting approval (${counts.awaiting})` },
    { key: "locked", label: `Locked PS (${counts.locked})` },
  ];

  return (
    <MentorShell title="Teams">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">{error}</div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-brand-sand bg-white">
          <LoadingState compact label="Loading teams" steps={["Fetching team records", "Preparing the list"]} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-10 w-10" />}
          heading="No teams allocated yet"
          description="Teams appear here when students invite you by email or an admin assigns you."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-10 w-10" />}
          heading="No teams match your search"
          description="Try a different name, code, track, or problem statement."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPsFilter("all");
              }}
              className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-brand-sand/60 p-5 md:flex-row">
            <div className="flex flex-wrap items-center gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setPsFilter(f.key)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                    psFilter === f.key
                      ? "bg-brand-lightOrange text-brand-primary shadow-sm"
                      : "text-brand-muted hover:bg-brand-cream hover:text-brand-deep"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search teams, leaders, PS…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-brand-sand bg-brand-cream py-2 pl-9 pr-3 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  <th className={`${COL_SIZES.team} border-b border-brand-sand/60 px-4 py-3 font-semibold`}>Team</th>
                  <th className={`${COL_SIZES.leader} border-b border-brand-sand/60 px-4 py-3 font-semibold`}>Leader</th>
                  <th className={`${COL_SIZES.ps} border-b border-brand-sand/60 px-4 py-3 font-semibold`}>Problem Statement</th>
                  <th className={`${COL_SIZES.members} border-b border-brand-sand/60 px-4 py-3 text-center font-semibold`}>Members</th>
                  <th className={`${COL_SIZES.score} border-b border-brand-sand/60 px-4 py-3 text-center font-semibold`}>Score</th>
                  <th className={`${COL_SIZES.chevron} border-b border-brand-sand/60 px-4 py-3`} aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ row, psStatus }) => {
                  const team = row.team;
                  const ps = team.problemStatement;
                  const published = team.stageResults?.find((r) => r.published);
                  const score = published ? Number(published.weightedScore) : null;
                  const memberCount = team.members?.length ?? 0;
                  const canOpen = psStatus !== "pending";
                  const detailHref = `/dashboard/mentor/teams/${team.id}`;

                  return (
                    <tr
                      key={team.id}
                      onClick={() => {
                        if (canOpen) router.push(detailHref);
                      }}
                      className={`border-b border-brand-sand/40 transition-colors last:border-b-0 ${
                        canOpen ? "cursor-pointer hover:bg-brand-cream/60" : ""
                      }`}
                    >
                      <td className={`${COL_SIZES.team} px-4 py-4 align-middle`}>
                        <div className="truncate text-sm font-bold text-brand-deep">{team.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-mono text-[11px] text-brand-muted">
                            {team.teamCode} · {team.theme ?? "No theme"}
                          </span>
                          {psStatus === "pending" && (
                            <span className="rounded-full bg-brand-amber/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                              Invite pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${COL_SIZES.leader} px-4 py-4 align-middle`}>
                        {team.leader ? (
                          <div className="flex items-center gap-3">
                            <Avatar src={null} seed={team.leader.fullName || team.leader.email} className="h-8 w-8" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-brand-charcoal">{team.leader.fullName}</div>
                              <div className="truncate font-mono text-[11px] text-brand-muted">{team.leader.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className={`${COL_SIZES.ps} px-4 py-4 align-middle`}>
                        {ps ? (
                          <>
                            <div className="truncate font-mono text-[11px] font-bold text-brand-primary">{ps.code}</div>
                            <div className="line-clamp-2 text-brand-charcoal">{ps.title}</div>
                          </>
                        ) : psStatus === "awaiting" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-amber/30 bg-brand-amber/10 px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                            Awaiting approval
                          </span>
                        ) : (
                          <span className="text-brand-muted">No PS selected</span>
                        )}
                      </td>
                      <td className={`${COL_SIZES.members} px-4 py-4 text-center align-middle`}>
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-sand bg-brand-cream px-2.5 py-1 font-bold text-brand-deep">
                          <UsersIcon className="h-3.5 w-3.5 text-brand-muted" />
                          {memberCount}/{team.memberCap ?? 6}
                        </span>
                      </td>
                      <td className={`${COL_SIZES.score} px-4 py-4 text-center align-middle`}>
                        {score !== null ? (
                          <span className="font-bold text-brand-approved">{score} / 100</span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className={`${COL_SIZES.chevron} px-4 py-4 text-right align-middle`}>
                        {canOpen ? (
                          <ChevronRightIcon className="ml-auto h-4 w-4 text-brand-muted" />
                        ) : (
                          <span className="text-brand-muted/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-brand-sand/60 px-5 py-4 text-right text-xs font-medium text-brand-muted">
            Showing {filtered.length} of {rows.length} teams
          </div>
        </section>
      )}
    </MentorShell>
  );
}