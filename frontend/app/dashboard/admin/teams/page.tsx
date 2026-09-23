"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../../../components/admin/AdminShell";
import Avatar from "../../../../components/Avatar";
import LoadingState from "../../../../components/LoadingState";
import { api } from "../../../../lib/api";
import { SearchIcon, UsersIcon, ChevronRightIcon } from "../../../../components/dashboard/icons";
import StatusPill, { STATUS_BADGES, type TeamStatus } from "../../../../components/admin/StatusPill";
import type { ReactNode } from "react";

type AdminTeam = {
  id: string;
  teamCode: string;
  name: string;
  theme?: string | null;
  institute: string;
  status: TeamStatus;
  memberCap: number;
  createdAt: string;
  leader: {
    id: string;
    fullName: string;
    email: string;
    department?: string | null;
    institute?: string | null;
  };
  problemStatement?: {
    id: string;
    code: string;
    title: string;
    theme: string;
    category: string;
  } | null;
  mentorAssignments: Array<{
    id: string;
    mentorType: "institute" | "industry";
    active: boolean;
    mentor: { id: string; fullName: string; email: string };
    industrialMentor?: { id: string; fullName: string } | null;
  }>;
  _count?: { members: number };
};

const STATUS_ORDER: TeamStatus[] = ["forming", "active", "locked", "disqualified"];

const COL_SIZES = {
  team: "w-[18%] min-w-[180px]",
  leader: "w-[21%] min-w-[200px]",
  status: "w-[10%] min-w-[110px]",
  ps: "w-[13%] min-w-[140px]",
  institute: "w-[13%] min-w-[130px]",
  mentors: "w-[15%] min-w-[170px]",
  members: "w-[6%] min-w-[80px]",
  chevron: "w-[4%] min-w-[36px]",
} as const;

function MentorCell({ assignments }: { assignments: AdminTeam["mentorAssignments"] }) {
  const institute = assignments.find((a) => a.mentorType === "institute");
  const industry = assignments.find((a) => a.mentorType === "industry");
  const industryName = industry
    ? industry.industrialMentor
      ? industry.industrialMentor.fullName
      : industry.mentor.fullName
    : "";

  return (
    <div>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          Faculty
        </span>
        <span className="max-w-[120px] truncate text-xs font-medium text-neutral-700">
          {institute ? institute.mentor.fullName : "None"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="shrink-0 rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
          Industrial
        </span>
        <span className="max-w-[120px] truncate text-xs font-medium text-neutral-700">
          {industryName || "None"}
        </span>
      </div>
    </div>
  );
}

function TableShell({ count, total, children }: { count: number; total: number; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      {children}
      <div className="mt-4 border-t border-neutral-100 pt-4 text-right text-xs font-medium text-neutral-500">
        Showing {count} of {total} teams
      </div>
    </section>
  );
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [total, setTotal] = useState(0);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "all">("all");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [res, dash] = await Promise.all([
          api<{ items: AdminTeam[]; total: number }>("/admin/teams?limit=500&page=1"),
          api<{ totalTeams: number; teamsByStatus: Array<{ status: TeamStatus; _count: number }> }>("/admin/dashboard"),
        ]);
        if (cancelled) return;
        setTeams(res.items ?? []);
        setTotal(res.total ?? 0);
        setByStatus(Object.fromEntries((dash.teamsByStatus ?? []).map((b) => [b.status, b._count])));
      } catch {
        if (!cancelled) setError("Failed to load teams. Refresh to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.teamCode.toLowerCase().includes(q) ||
        t.institute.toLowerCase().includes(q) ||
        t.leader.fullName.toLowerCase().includes(q) ||
        t.leader.email.toLowerCase().includes(q) ||
        (t.theme ?? "").toLowerCase().includes(q) ||
        (t.problemStatement?.title ?? "").toLowerCase().includes(q) ||
        (t.problemStatement?.code ?? "").toLowerCase().includes(q)
      );
    });
  }, [teams, search, statusFilter]);

  const statusPills: Array<{ key: TeamStatus | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: total },
    ...STATUS_ORDER.map((s) => ({
      key: s,
      label: STATUS_BADGES[s].label,
      count: byStatus[s] ?? teams.filter((t) => t.status === s).length,
    })),
  ];

  return (
    <AdminShell title="Teams">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">{error}</div>
      ) : loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-brand-sand bg-white">
          <LoadingState compact label="Loading teams" steps={["Fetching team records", "Preparing the list"]} />
        </div>
      ) : (
        <TableShell count={filtered.length} total={total}>
          <div className="flex flex-col items-center justify-between gap-4 border-b border-neutral-100 pb-6 md:flex-row">
            <div className="flex flex-wrap items-center gap-1.5">
              {statusPills.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    statusFilter === pill.key
                      ? "bg-brand-lightOrange text-brand-primary shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search teams, leaders, institutes, PS…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className={`${COL_SIZES.team} border-b border-neutral-100 px-3 py-3 font-semibold`}>Team</th>
                  <th className={`${COL_SIZES.leader} border-b border-neutral-100 px-3 py-3 font-semibold`}>Leader</th>
                  <th className={`${COL_SIZES.status} border-b border-neutral-100 px-3 py-3 text-center font-semibold`}>Status</th>
                  <th className={`${COL_SIZES.ps} border-b border-neutral-100 px-3 py-3 font-semibold`}>Problem Statement</th>
                  <th className={`${COL_SIZES.institute} border-b border-neutral-100 px-3 py-3 font-semibold`}>Institute</th>
                  <th className={`${COL_SIZES.mentors} border-b border-neutral-100 px-3 py-3 font-semibold`}>Mentors</th>
                  <th className={`${COL_SIZES.members} border-b border-neutral-100 px-3 py-3 text-right font-semibold`}>Members</th>
                  <th className={`${COL_SIZES.chevron} border-b border-neutral-100 px-3 py-3`} aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/dashboard/admin/teams/${t.id}`)}
                    className="cursor-pointer border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/60"
                  >
                    <td className={`${COL_SIZES.team} px-3 py-4 align-middle`}>
                      <div className="truncate text-sm font-bold text-neutral-900">{t.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">
                        {t.teamCode} · {t.theme ?? "No theme"}
                      </div>
                    </td>
                    <td className={`${COL_SIZES.leader} px-3 py-4 align-middle`}>
                      <div className="flex items-center gap-3">
                        <Avatar src={null} seed={t.leader.fullName || t.leader.email} className="h-8 w-8" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-neutral-900">
                            {t.leader.fullName}
                          </div>
                          <div className="truncate font-mono text-[11px] text-neutral-500">{t.leader.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${COL_SIZES.status} px-3 py-4 text-center align-middle`}>
                      <span className="inline-flex justify-center">
                        <StatusPill status={t.status} />
                      </span>
                    </td>
                    <td className={`${COL_SIZES.ps} px-3 py-4 align-middle`}>
                      {t.problemStatement ? (
                        <>
                          <div className="truncate font-mono text-[11px] font-bold text-brand-primary">
                            {t.problemStatement.code}
                          </div>
                          <div className="line-clamp-2 text-neutral-700">{t.problemStatement.title}</div>
                        </>
                      ) : (
                        <span className="text-neutral-400">No PS selected</span>
                      )}
                    </td>
                    <td className={`${COL_SIZES.institute} px-3 py-4 align-middle`}>
                      <span className="line-clamp-2 font-medium text-neutral-700">{t.institute}</span>
                    </td>
                    <td className={`${COL_SIZES.mentors} px-3 py-4 align-middle`}>
                      <MentorCell assignments={t.mentorAssignments ?? []} />
                    </td>
                    <td className={`${COL_SIZES.members} px-3 py-4 text-right align-middle`}>
                      <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-bold text-neutral-900">
                        <UsersIcon className="h-3.5 w-3.5 text-neutral-400" />
                        {t._count?.members ?? 0}/{t.memberCap}
                      </span>
                    </td>
                    <td className={`${COL_SIZES.chevron} px-3 py-4 text-right align-middle`}>
                      <ChevronRightIcon className="ml-auto h-4 w-4 text-neutral-300" aria-label="View team details" />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-xs font-medium text-neutral-500">
                      No teams match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TableShell>
      )}
    </AdminShell>
  );
}