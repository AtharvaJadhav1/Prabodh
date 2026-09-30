export type Bucket = { key: string; count: number };
export type WeekPoint = { label: string; count: number };

export type ReportSnapshot = {
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

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
      <p className="text-[11px] font-medium text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand-deep">{value}</p>
      {sub ? <p className="mt-1 text-[11px] font-medium text-brand-muted">{sub}</p> : null}
    </div>
  );
}

export function BarList({ rows, total }: { rows: Bucket[]; total?: number }) {
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

export function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
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

export function WeekChart({ points, label }: { points: WeekPoint[]; label: string }) {
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