"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../../components/admin/AdminShell";
import MetricCards from "../../../components/admin/MetricCards";
import {
  ZapIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  FileSpreadsheetIcon,
  ChevronRightIcon,
  CalendarClockIcon,
  BriefcaseIcon,
  HistoryIcon,
  UsersIcon,
  RocketIcon,
  BarChartIcon,
  CheckIcon,
} from "../../../components/dashboard/icons";
import { BarList, WeekChart, type ReportSnapshot } from "../../../components/admin/reportWidgets";
import { api } from "../../../lib/api";
import { useAdmin } from "../../../components/admin/AdminProvider";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof ZapIcon;
  iconBg: string;
  badge?: string;
  badgeStyle?: string;
};

const TEAM_STATUS_ORDER = ["forming", "active", "locked", "disqualified"] as const;

const TEAM_STATUS_STYLES: Record<string, string> = {
  forming: "bg-blue-50 text-blue-700 border border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  locked: "bg-amber-50 text-amber-700 border border-amber-200",
  disqualified: "bg-red-50 text-red-700 border border-red-200",
};

const TEAM_STATUS_BAR: Record<string, string> = {
  forming: "bg-blue-500",
  active: "bg-emerald-500",
  locked: "bg-amber-500",
  disqualified: "bg-red-500",
};

export default function AdminOverviewPage() {
  const { metrics, allocations, overview } = useAdmin();
  const [chartSnapshot, setChartSnapshot] = useState<ReportSnapshot | null>(null);
  const [chartError, setChartError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setChartSnapshot(await api<ReportSnapshot>("/admin/reports"));
      } catch (err) {
        setChartError(err instanceof Error ? err.message : "Failed to load charts");
      }
    })();
  }, []);

  const unassigned = allocations.filter((a) => a.status === "unassigned");
  const assignedCount = allocations.length - unassigned.length;
  const allocationPct = allocations.length
    ? Math.round((assignedCount / allocations.length) * 100)
    : 0;
  const totalMentors = metrics.totalInstituteMentors + metrics.totalIndustryMentors;

  const byStatus = new Map(overview.teamsByStatus.map((r) => [r.status, r.count]));
  const statusRows = TEAM_STATUS_ORDER.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  })).filter((r) => r.count > 0);
  const statusTotal = statusRows.reduce((s, r) => s + r.count, 0);
  const totalIdeas = overview.ideaSubmissions.reduce((s, r) => s + r.count, 0);
  const lockedIdeas = overview.ideaSubmissions.find((r) => r.status === "locked")?.count ?? 0;

  const recentTeams = overview.recentTeams.slice(0, 5);

  const quickActions: QuickAction[] = [
    {
      label: "Assign Mentors",
      href: "/dashboard/admin/mentor-allocation",
      icon: BriefcaseIcon,
      iconBg: "bg-[#C25E26]/10 text-[#C25E26]",
      badge: metrics.pendingAllocations > 0 ? `${metrics.pendingAllocations} unallocated` : undefined,
      badgeStyle: "border border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Add / Manage Users",
      href: "/dashboard/admin/users",
      icon: UserPlusIcon,
      iconBg: "bg-[#059669]/10 text-[#059669]",
    },
    {
      label: "Review Teams",
      href: "/dashboard/admin/teams",
      icon: ShieldCheckIcon,
      iconBg: "bg-[#4A2810]/10 text-[#4A2810]",
    },
    {
      label: "Generate Reports",
      href: "/dashboard/admin/reports",
      icon: FileSpreadsheetIcon,
      iconBg: "bg-[#D97706]/10 text-[#D97706]",
    },
  ];

  return (
    <AdminShell title="Admin Console">
      <MetricCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="text-base font-bold text-brand-deep">Unassigned Teams</h2>
              <Link
                href="/dashboard/admin/mentor-allocation"
                className="flex items-center gap-1 text-xs font-bold text-[#C25E26] hover:underline"
              >
                Go to allocation <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-xs font-medium text-brand-muted">All teams have an assigned mentor.</p>
            ) : (
              <div className="space-y-3">
                {unassigned.slice(0, 4).map((a) => (
                  <div
                    key={a.teamId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand-softline/60 bg-[#FAF7F2]/50 p-3 transition-colors hover:bg-[#FAF7F2]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-deep">{a.teamName}</p>
                      <p className="truncate text-xs text-brand-muted">{a.track}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Unassigned
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97706]/10 text-[#D97706]">
                    <BarChartIcon className="h-4 w-4 text-current" />
                  </div>
                  <h2 className="text-base font-bold text-brand-deep">Quick Charts</h2>
                </div>
                <Link
                  href="/dashboard/admin/reports"
                  className="flex items-center gap-1 text-xs font-bold text-[#C25E26] hover:underline"
                >
                  Full report <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              {chartError ? (
                <p className="text-xs font-medium text-brand-muted">{chartError}</p>
              ) : !chartSnapshot ? (
                <p className="text-xs font-medium text-brand-muted">Loading charts…</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-brand-charcoal">Teams by Domain</p>
                    <BarList rows={chartSnapshot.teams.byPSTheme.slice(0, 4)} total={chartSnapshot.kpi.totalTeams} />
                  </div>
                  <div className="border-t border-brand-softline/60 pt-4">
                    <WeekChart points={chartSnapshot.engagement.teamsPerWeek} label="New teams per week" />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BarChartIcon className="h-4 w-4 text-current" />
                  </div>
                  <h2 className="text-base font-semibold text-stone-800">Team Status</h2>
                </div>
                <span className="text-xs font-medium text-stone-500">{statusTotal} Total</span>
              </div>

              {statusRows.length === 0 ? (
                <p className="text-xs font-medium text-stone-500">No teams yet.</p>
              ) : (
                <div className="space-y-4">
                  {statusRows.map((row) => {
                    const pct = statusTotal ? Math.round((row.count / statusTotal) * 100) : 0;
                    const pill = TEAM_STATUS_STYLES[row.status] ?? "bg-slate-50 text-slate-600 border border-slate-200";
                    const bar = TEAM_STATUS_BAR[row.status] ?? "bg-[#C25E26]";
                    return (
                      <div key={row.status} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${pill}`}>
                            {row.status}
                          </span>
                          <span className="text-xs font-medium text-stone-500">
                            {row.count} team{row.count === 1 ? "" : "s"} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${bar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-xl border border-[#f0ece5] bg-[#faf8f5] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Idea Submissions
                  </p>
                  <Link
                    href="/dashboard/admin/teams?filter=submitted"
                    className="shrink-0 text-[11px] font-semibold text-[#c25e24] hover:underline"
                  >
                    Review Submissions &rarr;
                  </Link>
                </div>
                {totalIdeas === 0 ? (
                  <p className="mt-2 text-sm font-medium text-stone-500">No idea submissions yet.</p>
                ) : (
                  <>
                    <p className="mt-2 text-2xl font-extrabold leading-none text-stone-900">
                      {lockedIdeas}{" "}
                      <span className="text-sm font-medium text-stone-500">/ {totalIdeas} Locked</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-[#c25e24] transition-all duration-500"
                        style={{ width: `${Math.round((lockedIdeas / totalIdeas) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-stone-500">
                      {Math.round((lockedIdeas / totalIdeas) * 100)}% of ideas locked
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-[#f0ece5] bg-white p-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Mentor Assignment
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-stone-900">
                    {assignedCount} / {allocations.length}{" "}
                    <span className="text-xs font-medium text-stone-500">Assigned</span>
                  </p>
                </div>
                <Link
                  href="/dashboard/admin/teams"
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#c25e24] hover:underline"
                >
                  View all teams in detail <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4A2810]/10 text-[#4A2810]">
                  <RocketIcon className="h-4 w-4 text-current" />
                </div>
                <h2 className="text-base font-bold text-brand-deep">Recently Registered Teams</h2>
              </div>
              <Link
                href="/dashboard/admin/teams"
                className="flex items-center gap-1 text-xs font-bold text-[#C25E26] hover:underline"
              >
                View all <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            {recentTeams.length === 0 ? (
              <p className="text-xs font-medium text-brand-muted">No teams yet.</p>
            ) : (
              <div className="space-y-2">
                {recentTeams.map((team) => {
                  const style = TEAM_STATUS_STYLES[team.status] ?? "border-slate-200 bg-slate-50 text-slate-600";
                  const created = team.createdAt
                    ? new Date(team.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    : "—";
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-brand-softline/60 bg-[#FAF7F2]/50 p-3 transition-colors hover:bg-[#FAF7F2]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C25E26]/10 text-[#C25E26]">
                          <UsersIcon className="h-4 w-4 text-current" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-brand-deep">{team.name}</p>
                          <p className="truncate text-xs text-brand-muted">
                            {team.teamCode} · {team.track}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${style}`}>
                          {team.status}
                        </span>
                        <span className="hidden text-xs font-medium text-brand-muted sm:block">{created}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C25E26]/10 text-[#C25E26]">
                <ZapIcon className="h-4 w-4 text-current" />
              </div>
              <h2 className="text-base font-bold text-brand-deep">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition-colors hover:border-brand-softline/60 hover:bg-[#fbf7f2]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}
                      >
                        <Icon className="h-4 w-4 text-current" />
                      </div>
                      <span className="truncate text-sm font-semibold text-brand-charcoal group-hover:text-brand-deep">
                        {action.label}
                      </span>
                    </div>
                    {action.badge ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${action.badgeStyle}`}
                      >
                        {action.badge}
                      </span>
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[#C25E26]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4A2810]/10 text-[#4A2810]">
                <CalendarClockIcon className="h-4 w-4 text-current" />
              </div>
              <h2 className="text-base font-bold text-brand-deep">Stage Status</h2>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-softline/60 bg-[#FAF7F2]/60 p-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Active Stage
                </p>
                <p className="mt-0.5 break-words text-sm font-bold text-brand-deep">{metrics.activeStage}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#C25E26]/30 bg-[#C25E26]/10 px-3 py-1 text-xs font-bold text-[#C25E26]">
                Live
              </span>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckIcon className="h-4 w-4 text-current" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-deep">{overview.activeMentorAssignments}</p>
                <p className="text-[11px] font-medium text-brand-muted">active mentor assignments</p>
              </div>
            </div>

            <div className="mb-5">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 text-xs">
                <span className="font-bold text-brand-deep">Mentor Allocation</span>
                <span className="font-medium text-brand-muted">
                  {assignedCount}/{allocations.length} teams
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-brand-softline/60">
                <div
                  className="h-full rounded-full bg-[#C25E26] transition-all"
                  style={{ width: `${allocationPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-brand-muted">
                {allocationPct}% assigned · {unassigned.length} team{unassigned.length === 1 ? "" : "s"} still need a mentor
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-brand-softline/60 bg-white p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  <UsersIcon className="h-3.5 w-3.5 text-current" />
                  Mentors
                </div>
                <p className="mt-1 text-xl font-extrabold leading-none text-brand-deep">{totalMentors}</p>
                <p className="mt-1 text-[11px] font-medium text-brand-muted">
                  {metrics.totalInstituteMentors} institute · {metrics.totalIndustryMentors} industry
                </p>
              </div>
              <div className="rounded-xl border border-brand-softline/60 bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Pending
                </div>
                <p className="mt-1 text-xl font-extrabold leading-none text-amber-700">
                  {metrics.pendingAllocations}
                </p>
                <p className="mt-1 text-[11px] font-medium text-brand-muted">unassigned teams</p>
              </div>
            </div>

            <Link
              href="/dashboard/admin/logs"
              className="flex items-center gap-1 text-xs font-bold text-[#C25E26] hover:underline"
            >
              <HistoryIcon className="h-3.5 w-3.5 text-current" />
              View Audit Logs <span aria-hidden="true">&rarr;</span>
            </Link>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}