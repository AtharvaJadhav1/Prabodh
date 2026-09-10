"use client";

import { useMemo } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import { useAdmin } from "../../../../components/admin/AdminProvider";
import { tracks } from "../../../../data/adminDashboard";

export default function AdminReportsPage() {
  const { teams, allocations, industryMentors } = useAdmin();

  const byTrack = useMemo(() => {
    return tracks
      .filter((t) => t !== "All Tracks")
      .map((track) => ({
        track,
        count: teams.filter((t) => t.track.includes(track.split(" & ")[0]) || t.track === track).length,
      }));
  }, [teams]);

  const scored = teams.filter((t) => t.score !== undefined);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, t) => sum + (t.score ?? 0), 0) / scored.length) : 0;

  const industryCoverage = useMemo(() => {
    const mapped = new Set(industryMentors.flatMap((m) => m.mappedTeamIds));
    return Math.round((mapped.size / (teams.length || 1)) * 100);
  }, [industryMentors, teams]);

  return (
    <AdminShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Admin Console" }, { label: "Reports" }]}
      title="Platform Reports"
      subtitle="Aggregated read-only views across teams, mentors, and scoring."
      showActions={false}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
            <p className="text-[11px] font-medium text-brand-muted">Mentor Allocation Coverage</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-deep">
              {allocations.filter((a) => a.status === "assigned").length} / {allocations.length}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
            <p className="text-[11px] font-medium text-brand-muted">Average Score (Evaluated Teams)</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-deep">{avgScore || "—"}</p>
          </div>
          <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
            <p className="text-[11px] font-medium text-brand-muted">Industry Mentor Coverage</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-deep">{industryCoverage}%</p>
          </div>
        </div>

        <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-brand-deep">Teams by Track</h2>
          <div className="space-y-2">
            {byTrack.map((row) => (
              <div key={row.track} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs font-semibold text-brand-charcoal">{row.track}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-cream">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${teams.length > 0 ? (row.count / teams.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold text-brand-deep">{row.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
