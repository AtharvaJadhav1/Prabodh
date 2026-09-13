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
    <AdminShell breadcrumb={[{ label: "Prabodh Portal" }, { label: "Admin Console" }, { label: "Overview" }]} title="Admin Overview">
      <MetricCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">Unassigned Teams</h2>
            <Link href="/dashboard/admin/mentor-allocation" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              Go to allocation &rarr;
            </Link>
          </div>
          {unassigned.length === 0 ? (
            <p className="text-xs font-medium text-brand-muted">All teams have an assigned mentor.</p>
          ) : (
            <div className="space-y-3">
              {unassigned.slice(0, 4).map((a) => (
                <div key={a.teamId} className="flex items-center justify-between rounded-xl border border-brand-sand bg-brand-cream p-3">
                  <div>
                    <p className="text-xs font-bold text-brand-deep">{a.teamName}</p>
                    <p className="text-[11px] text-brand-muted">{a.track}</p>
                  </div>
                  <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary">
                    Unassigned
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-deep">Recent Broadcasts</h2>
            <Link href="/dashboard/admin/broadcasts" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              View all &rarr;
            </Link>
          </div>
          <BroadcastFeed broadcasts={broadcasts.slice(0, 2)} />
        </section>
      </div>
    </AdminShell>
  );
}
