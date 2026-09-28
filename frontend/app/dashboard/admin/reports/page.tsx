"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import { api, apiPost } from "../../../../lib/api";
import { API_BASE } from "../../../../lib/config";

type Bucket = { key: string; count: number };
type WeekPoint = { label: string; count: number };

type ReportSnapshot = {
  generatedAt: string;
  kpi: {
    totalUsers: number;
    students: number;
    instituteMentors: number;
    industryMentors: number;
    experts: number;
    admins: number;
    totalTeams: number;
    totalProblemStatements: number;
    totalIdeas: number;
    totalDeliverables: number;
  };
  teams: {
    byStatus: Bucket[];
    byPSTheme: Bucket[];
    byCategory: Bucket[];
    byInstitute: Bucket[];
    bySize: Bucket[];
    avgTeamSize: number;
    teamsWithoutPs: number;
  };
  psPool: {
    total: number;
    byTheme: Bucket[];
    byCategory: Bucket[];
    byOrganisation: Bucket[];
    totalSlots: number;
    filledTeams: number;
    utilizationPct: number;
    popular: Array<{ code: string; title: string; count: number; capacity: number | null }>;
  };
  mentors: {
    activeInstituteMentors: number;
    activeIndustryMentors: number;
    instituteMentorsWithTeams: number;
    activeAssignments: number;
    avgTeamsPerMentor: number;
    mentorsWithNoTeams: number;
    loadBuckets: Bucket[];
    byMethod: Bucket[];
    invites: Bucket[];
    coverage: { withBoth: number; withInstituteOnly: number; withIndustryOnly: number; withNone: number };
    industryProfilesTotal: number;
  };
  scoring: {
    evaluatedTeams: number;
    avgScore: number | null;
    scoreCount: number;
    distribution: Bucket[];
    byStage: Array<{ stageId: string; stageName: string; avgScore: number; evaluated: number }>;
    topTeams: Array<{ teamId: string; name: string; teamCode: string; avgScore: number }>;
  };
  progress: {
    stages: Array<{
      id: string;
      name: string;
      sequence: number;
      deadline: string;
      isActive: boolean;
      notStarted: number;
      inProgress: number;
      submitted: number;
      reviewed: number;
      deliverables: number;
    }>;
  };
  engagement: {
    teamsPerWeek: WeekPoint[];
    submissionsPerWeek: WeekPoint[];
  };
};

const MAX_BAR = 5;

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
      <p className="text-[11px] font-medium text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand-deep">{value}</p>
      {sub ? <p className="mt-1 text-[11px] font-medium text-brand-muted">{sub}</p> : null}
    </div>
  );
}

function BarList({ rows, total }: { rows: Bucket[]; total?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const denominator = total ?? rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-xs font-semibold text-brand-charcoal">{row.key}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-cream">
            <div
              className="h-full rounded-full bg-brand-primary"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-bold text-brand-deep">
            {row.count}
            {denominator > 0 ? <span className="font-medium text-brand-muted"> ({Math.round((row.count / denominator) * 100)}%)</span> : null}
          </span>
        </div>
      ))}
      {rows.length === 0 ? <p className="text-xs text-brand-muted">No data yet.</p> : null}
    </div>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-brand-deep">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function WeekChart({ points, label }: { points: WeekPoint[]; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-brand-charcoal">{label}</p>
      {points.length === 0 ? (
        <p className="text-xs text-brand-muted">No activity recorded.</p>
      ) : (
        <div className="flex h-28 items-end gap-1.5">
          {points.map((p) => (
            <div key={p.label} className="group flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-brand-deep">{p.count}</span>
              <div
                className="w-full min-w-[6px] rounded-t-md bg-brand-warmBorder transition-colors group-hover:bg-brand-primary"
                style={{ height: `${Math.max(4, (p.count / max) * 76)}px` }}
                title={p.label}
              />
            </div>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[10px] font-medium text-brand-muted">
        Weeks are bucketed from the earliest recorded event ({points.length ? points[0].label : "—"} onwards).
      </p>
    </div>
  );
}

export default function AdminReportsPage() {
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportMsg, setExportMsg] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setSnapshot(await api<ReportSnapshot>("/admin/reports"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runExport = async () => {
    setExportMsg("Queuing export…");
    try {
      const job = await apiPost<{ id: string }>("/admin/export", { format: "xlsx", dataset: "teams" });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await api<{ status: string; downloadUrl?: string | null }>(`/admin/export/${job.id}`);
        if (status.status === "complete" && status.downloadUrl) {
          const href = status.downloadUrl.startsWith("/") ? `${API_BASE}${status.downloadUrl}` : status.downloadUrl;
          const a = document.createElement("a");
          a.href = href;
          a.download = `teams-export.${job.id}.xlsx`;
          a.click();
          setExportMsg("Export downloaded.");
          return;
        }
        if (status.status === "failed") {
          setExportMsg("Export failed.");
          return;
        }
      }
      setExportMsg("Export still running — check again shortly.");
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <AdminShell title="Platform Reports">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-brand-muted">
            {snapshot ? `Snapshot generated at ${new Date(snapshot.generatedAt).toLocaleString()}` : "Platform analytics"}
          </p>
          <button
            type="button"
            onClick={runExport}
            className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c04d1c]"
          >
            Export teams (XLSX)
          </button>
        </div>
        {exportMsg ? <p className="text-xs text-brand-muted">{exportMsg}</p> : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-brand-muted">Loading reports…</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-brand-overdue">{error}</p>
        ) : snapshot ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              <StatCard label="Total Users" value={snapshot.kpi.totalUsers} />
              <StatCard label="Students" value={snapshot.kpi.students} />
              <StatCard label="Institute Mentors" value={snapshot.kpi.instituteMentors} />
              <StatCard label="Industry Mentors" value={snapshot.kpi.industryMentors} />
              <StatCard label="Total Teams" value={snapshot.kpi.totalTeams} />
              <StatCard label="Problem Statements" value={snapshot.kpi.totalProblemStatements} />
              <StatCard label="Idea Submissions" value={snapshot.kpi.totalIdeas} />
              <StatCard label="Deliverables" value={snapshot.kpi.totalDeliverables} />
              <StatCard
                label="Avg Team Size"
                value={snapshot.teams.avgTeamSize}
                sub={`${snapshot.teams.teamsWithoutPs} team(s) without a PS`}
              />
            </div>

            <Card title="Team Distribution">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Domain (incl. No PS Assigned)</p>
                  <BarList rows={snapshot.teams.byPSTheme} total={snapshot.kpi.totalTeams} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Status</p>
                  <BarList rows={snapshot.teams.byStatus} total={snapshot.kpi.totalTeams} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Category</p>
                  <BarList rows={snapshot.teams.byCategory} total={snapshot.kpi.totalTeams} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Team Size</p>
                  <BarList rows={snapshot.teams.bySize} total={snapshot.kpi.totalTeams} />
                </div>
              </div>
            </Card>

            <Card title="Top Institutes">
              <BarList rows={snapshot.teams.byInstitute} total={snapshot.kpi.totalTeams} />
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <StatCard label="PS Pool Utilization" value={`${snapshot.psPool.utilizationPct}%`}
                sub={`${snapshot.psPool.filledTeams} of ${snapshot.psPool.totalSlots} seats filled`} />
              <StatCard label="Popular Problem Statements" value={snapshot.psPool.popular.length ? snapshot.psPool.popular[0].code : "—"}
                sub={snapshot.psPool.popular[0]?.title ?? "No PS selected yet"} />
              <StatCard label="Active Mentor Load" value={snapshot.mentors.avgTeamsPerMentor}
                sub={`${snapshot.mentors.activeAssignments} assignments across ${snapshot.mentors.instituteMentorsWithTeams} mentors`} />
            </div>

            <Card title="Problem Statement Pool">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Domain</p>
                  <BarList rows={snapshot.psPool.byTheme} total={snapshot.psPool.total} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">By Category</p>
                  <BarList rows={snapshot.psPool.byCategory} total={snapshot.psPool.total} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Most Selected (Top 5)</p>
                  <div className="space-y-2">
                    {snapshot.psPool.popular.map((p) => (
                      <div key={p.code} className="flex items-center justify-between gap-3 rounded-xl border border-brand-cream bg-brand-cream/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-brand-deep">{p.code}</p>
                          <p className="truncate text-[11px] text-brand-muted">{p.title}</p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-brand-primary">
                          {p.count}/{(p.capacity ?? "∞")}
                        </span>
                      </div>
                    ))}
                    {snapshot.psPool.popular.length === 0 ? <p className="text-xs text-brand-muted">No PS selected yet.</p> : null}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Top Contributing Organisations</p>
                  <BarList rows={snapshot.psPool.byOrganisation} total={snapshot.psPool.total} />
                </div>
              </div>
            </Card>

            <Card title="Mentor Coverage & Assignment">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Coverage</p>
                  <BarList rows={[
                    { key: "Both mentors", count: snapshot.mentors.coverage.withBoth },
                    { key: "Institute only", count: snapshot.mentors.coverage.withInstituteOnly },
                    { key: "Industry only", count: snapshot.mentors.coverage.withIndustryOnly },
                    { key: "No mentor", count: snapshot.mentors.coverage.withNone },
                  ]} total={snapshot.kpi.totalTeams} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Load Per Mentor</p>
                  <BarList rows={snapshot.mentors.loadBuckets} />
                  <p className="mt-3 text-xs font-medium text-brand-muted">
                    {snapshot.mentors.mentorsWithNoTeams} active mentor(s) have no team assigned.
                  </p>
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Assignment Method</p>
                  <BarList rows={snapshot.mentors.byMethod} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Mentor Invite Funnel</p>
                  <BarList rows={snapshot.mentors.invites} />
                </div>
              </div>
            </Card>

            <Card title="Scoring (Published Evaluations)">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Evaluated Teams" value={snapshot.scoring.evaluatedTeams} />
                <StatCard label="Avg Score" value={snapshot.scoring.avgScore ?? "—"} />
                <StatCard label="Published Results" value={snapshot.scoring.scoreCount} />
                <StatCard label="Top Team" value={snapshot.scoring.topTeams[0]?.teamCode ?? "—"}
                  sub={snapshot.scoring.topTeams[0]?.name} />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Score Distribution</p>
                  <BarList rows={snapshot.scoring.distribution} />
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold text-brand-charcoal">Average by Stage</p>
                  {snapshot.scoring.byStage.map((s) => (
                    <div key={s.stageId} className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-brand-charcoal">{s.stageName}</span>
                      <span className="text-xs font-bold text-brand-deep">{s.avgScore} <span className="font-medium text-brand-muted">({s.evaluated} teams)</span></span>
                    </div>
                  ))}
                  {snapshot.scoring.byStage.length === 0 ? <p className="text-xs text-brand-muted">No published scores yet.</p> : null}
                </div>
              </div>
            </Card>

            <Card title="Stage Progress">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-brand-sand text-[10px] uppercase tracking-wider text-brand-muted">
                      <th className="px-3 py-3 font-bold">Stage</th>
                      <th className="px-3 py-3 font-bold">Not Started</th>
                      <th className="px-3 py-3 font-bold">In Progress</th>
                      <th className="px-3 py-3 font-bold">Submitted</th>
                      <th className="px-3 py-3 font-bold">Reviewed</th>
                      <th className="px-3 py-3 font-bold">Deliverables</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-sand">
                    {snapshot.progress.stages.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-3 font-bold text-brand-deep">{s.name}</td>
                        <td className="px-3 py-3">{s.notStarted}</td>
                        <td className="px-3 py-3">{s.inProgress}</td>
                        <td className="px-3 py-3">{s.submitted}</td>
                        <td className="px-3 py-3">{s.reviewed}</td>
                        <td className="px-3 py-3">{s.deliverables}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Engagement — Teams Created per Week">
                <WeekChart points={snapshot.engagement.teamsPerWeek} label="New teams per week" />
              </Card>
              <Card title="Engagement — Deliverable Submissions per Week">
                <WeekChart points={snapshot.engagement.submissionsPerWeek} label="Deliverables per week" />
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}