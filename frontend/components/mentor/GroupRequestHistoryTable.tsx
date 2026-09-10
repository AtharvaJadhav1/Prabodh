"use client";

import { useMemo, useState } from "react";
import type { GroupRequestHistoryEntry } from "../../data/mentorDashboard";
import { SearchIcon, InboxIcon } from "../dashboard/icons";

type StatusFilter = "ALL" | "ACCEPTED" | "DECLINED";

type Props = {
  history: GroupRequestHistoryEntry[];
};

export default function GroupRequestHistoryTable({ history }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return history.filter((h) => {
      const matchesSearch =
        !q ||
        h.teamName.toLowerCase().includes(q) ||
        h.leaderName.toLowerCase().includes(q) ||
        h.groupId.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || h.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [history, search, statusFilter]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-sand bg-white py-16 px-6 text-center shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-cream">
          <InboxIcon className="h-8 w-8 text-brand-muted" />
        </div>
        <h3 className="text-lg font-bold text-brand-deep">No responses yet</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">
          Accepted and declined requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-sand bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-brand-sand px-4 py-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Search by team name, leader, or group ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-brand-sand bg-brand-cream py-2 pl-9 pr-3 text-xs text-brand-deep placeholder:text-brand-muted/60 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-brand-sand bg-brand-cream px-3 py-2 text-xs font-medium text-brand-deep focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
        >
          <option value="ALL">All</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="DECLINED">Declined</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60">
              <th className="px-4 py-3 font-bold text-brand-muted">Team</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Group ID</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Leader</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Members</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Role</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Received</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Responded</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Status</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((h) => (
              <tr key={h.groupId} className="transition-colors hover:bg-brand-cream/40">
                <td className="px-4 py-3 font-bold text-brand-deep">{h.teamName}</td>
                <td className="px-4 py-3 font-mono text-brand-muted">{h.groupId}</td>
                <td className="px-4 py-3 text-brand-deep">{h.leaderName}</td>
                <td className="px-4 py-3 text-center text-brand-deep">{h.memberCount}</td>
                <td className="px-4 py-3 text-brand-deep">{h.allocatedRole}</td>
                <td className="px-4 py-3 text-brand-muted">{h.receivedDate}</td>
                <td className="px-4 py-3 text-brand-muted">{h.respondedDate}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      h.status === "ACCEPTED"
                        ? "bg-brand-approved/10 text-brand-approved"
                        : "bg-brand-overdue/10 text-brand-overdue"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${h.status === "ACCEPTED" ? "bg-brand-approved" : "bg-brand-overdue"}`} />
                    {h.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted/60 cursor-not-allowed">
                    View Profile
                    <span className="rounded bg-brand-sand px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted/70">Soon</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-brand-sand px-4 py-3">
        <span className="text-[11px] text-brand-muted">
          Showing {filtered.length} of {history.length} entries
        </span>
        <span className="text-[11px] font-medium text-brand-muted/70">
          Page 1 of 1
        </span>
      </div>
    </div>
  );
}
