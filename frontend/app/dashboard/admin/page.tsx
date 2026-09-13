"use client";

import Link from "next/link";
import AdminShell from "../../../components/admin/AdminShell";
import MetricCards from "../../../components/admin/MetricCards";
import BroadcastFeed from "../../../components/admin/BroadcastFeed";
import { useAdmin } from "../../../components/admin/AdminProvider";

export default function AdminOverviewPage() {
  const { metrics, allocations, broadcasts } = useAdmin();
  const unassigned = allocations.filter((a) => a.status === "unassigned");

  return (
    <AdminShell title="Admin Console">
      <MetricCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
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
                  className="flex items-center justify-between rounded-xl border border-brand-softline/60 bg-[#FAF7F2]/50 p-3 transition-colors hover:bg-[#FAF7F2]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-deep">{a.teamName}</p>
                    <p className="truncate text-xs text-brand-muted">{a.track}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Unassigned
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">Recent Broadcasts</h2>
            <Link
              href="/dashboard/admin/broadcasts"
              className="flex items-center gap-1 text-xs font-bold text-[#C25E26] hover:underline"
            >
              View all <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <BroadcastFeed broadcasts={broadcasts.slice(0, 2)} />
        </section>
      </div>
    </AdminShell>
  );
}
