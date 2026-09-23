"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import FilterDropdown, { type FilterDropdownOption } from "../../../../components/admin/FilterDropdown";
import { api } from "../../../../lib/api";
import { FileSpreadsheetIcon, RefreshIcon, SearchIcon } from "../../../../components/dashboard/icons";

type AuditActor = { id: string; email: string; fullName: string; platformRole: string };
type AuditRow = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: AuditActor | null;
  actorRole: string | null;
  teamName: string | null;
  teamCode: string | null;
  summary: string;
};
type AuditMeta = { items: AuditRow[]; total: number; page: number; pages: number };

const PAGE_SIZE = 50;

const CATEGORIES: FilterDropdownOption[] = [
  { value: "", label: "All Actions" },
  { value: "team_formation", label: "Team Formation" },
  { value: "mentor_allocation", label: "Mentor Allocation" },
  { value: "mentor_override", label: "Mentor Override" },
  { value: "industry_invites", label: "Industry Invites" },
  { value: "milestone_reviews", label: "Milestone Reviews" },
];

const DATE_RANGES: FilterDropdownOption[] = [
  { value: "", label: "All Time" },
  { value: "24", label: "Last 24 Hours" },
  { value: "168", label: "Last 7 Days" },
  { value: "720", label: "Last 30 Days" },
];

const ACTION_LABELS: Record<string, string> = {
  "team.created": "Team Created",
  "team.renamed": "Team Renamed",
  "team.lock": "Team Locked",
  "team.disqualify": "Team Disqualified",
  "team.invite": "Member Invited",
  "team.join": "Member Joined",
  "mentor.allocate": "Mentor Assigned",
  "mentor.reassign": "Mentor Reassigned",
  "mentor.assign_industry": "Industry Mentor Assigned",
  "mentor.invite": "Mentor Invited",
  "mentor.invite_accepted": "Invite Accepted",
  "evaluation.submitted": "Evaluation Submitted",
  "evaluation.publish": "Results Published",
  "broadcast.send": "Broadcast Sent",
};

const ACTION_BADGES: Record<string, string> = {
  "team.created": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "team.renamed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "team.join": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "team.invite": "bg-sky-50 text-sky-700 border-sky-200",
  "team.lock": "bg-red-50 text-red-700 border-red-200",
  "team.disqualify": "bg-red-50 text-red-700 border-red-200",
  "mentor.allocate": "bg-blue-50 text-blue-700 border-blue-200",
  "mentor.reassign": "bg-amber-50 text-amber-700 border-amber-200",
  "mentor.assign_industry": "bg-purple-50 text-purple-700 border-purple-200",
  "mentor.invite": "bg-purple-50 text-purple-700 border-purple-200",
  "mentor.invite_accepted": "bg-purple-50 text-purple-700 border-purple-200",
  "evaluation.submitted": "bg-teal-50 text-teal-700 border-teal-200",
  "evaluation.publish": "bg-teal-50 text-teal-700 border-teal-200",
  "broadcast.send": "bg-slate-50 text-slate-700 border-slate-200",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  student: "Student",
  institute_mentor: "Mentor",
  industry_mentor: "Industry Mentor",
  student_expert: "Student Expert",
};

const ROLE_PILLS: Record<string, string> = {
  admin: "bg-[#fff5ee] text-[#d95c26]",
  student: "bg-sky-50 text-sky-700",
  institute_mentor: "bg-blue-50 text-blue-700",
  industry_mentor: "bg-purple-50 text-purple-700",
  student_expert: "bg-violet-50 text-violet-700",
};

const DEFAULT_BADGE = "bg-neutral-50 text-neutral-700 border-neutral-200";

function actionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .replace(/[._]/g, " ")
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ")
  );
}

function formatTimestamp(iso: string): string {
  const s = new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const idx = s.lastIndexOf(", ");
  return idx >= 0 ? `${s.slice(0, idx)} •${s.slice(idx + 1)}` : s;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

export default function AdminLogsPage() {
  const [category, setCategory] = useState("");
  const [hours, setHours] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [category, hours, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(page));
      if (category) params.set("category", category);
      if (hours) params.set("hours", hours);
      if (q) params.set("search", q);
      const res = await api<AuditMeta>(`/admin/logs?${params.toString()}`);
      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
      setPages(res.pages ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, hours, q, page, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = "Timestamp,Action,Actor,Actor Email,Actor Role,Target Team,Details";
    const lines = rows.map((r) =>
      [
        new Date(r.createdAt).toISOString(),
        r.action,
        r.actor?.fullName ?? "",
        r.actor?.email ?? "",
        r.actorRole ?? "",
        r.teamCode ? `${r.teamName} (${r.teamCode})` : r.teamName ?? "",
        r.summary ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const content = [header, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell title="Audit Logs">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search summary, team, or actor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#d95c26] focus:ring-2 focus:ring-[#d95c26]/10"
              />
              <SearchIcon className="absolute right-3 top-3 h-4 w-4 text-neutral-400" />
            </div>
            <FilterDropdown options={CATEGORIES} value={category} onChange={setCategory} className="w-full sm:w-56" />
            <FilterDropdown options={DATE_RANGES} value={hours} onChange={setHours} className="w-full sm:w-44" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            >
              <RefreshIcon className="h-4 w-4 text-neutral-500" />
              Refresh Logs
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
              className={`inline-flex items-center gap-2 rounded-xl bg-[#d95c26] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors ${
                rows.length === 0
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-[#c4501d]"
              }`}
            >
              <FileSpreadsheetIcon className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500">
              {total} event{total === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-neutral-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-[#d95c26]" />
              Loading logs...
            </div>
          ) : error ? (
            <div className="px-3 py-16 text-center text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-16 text-center text-sm text-neutral-500">
              No activity found. Adjust the filters or try a different search.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    <th className="border-b border-neutral-100 px-3 py-3 font-semibold">Timestamp</th>
                    <th className="border-b border-neutral-100 px-3 py-3 font-semibold">Action</th>
                    <th className="border-b border-neutral-100 px-3 py-3 font-semibold">Actor</th>
                    <th className="border-b border-neutral-100 px-3 py-3 font-semibold">Target Entity</th>
                    <th className="border-b border-neutral-100 px-3 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/60"
                    >
                      <td className="whitespace-nowrap px-3 py-4 align-middle">
                        <div className="font-medium text-neutral-700">{formatTimestamp(row.createdAt)}</div>
                        <div className="mt-0.5 text-[11px] text-neutral-400">{timeAgo(row.createdAt)}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 align-middle">
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                            ACTION_BADGES[row.action] ?? DEFAULT_BADGE
                          }`}
                        >
                          {actionLabel(row.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 align-middle">
                        {row.actor ? (
                          <div>
                            <div className="font-medium text-neutral-800">{row.actor.fullName}</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[11px] text-neutral-400">{row.actor.email}</span>
                              {row.actorRole ? (
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_PILLS[row.actorRole] ?? "bg-neutral-100 text-neutral-600"}`}>
                                  {ROLE_LABELS[row.actorRole] ?? row.actorRole}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">System</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 align-middle">
                        {row.teamCode ? (
                          <div>
                            <div className="font-medium text-neutral-800">{row.teamName}</div>
                            <div className="text-[11px] text-neutral-400">{row.teamCode}</div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="max-w-[380px] px-3 py-4 align-middle text-neutral-600">
                        <div className="line-clamp-2">{row.summary || "—"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && pages > 1 && (
            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-500">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}