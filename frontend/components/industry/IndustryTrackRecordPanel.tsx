"use client";

import { useIndustryProfile, type IndustryTrackRecordEntry } from "./IndustryProfileProvider";
import { TrophyIcon } from "../dashboard/icons";

export default function IndustryTrackRecordPanel() {
  const { profile, stats } = useIndustryProfile();
  const { trackRecord } = profile;

  const derived: IndustryTrackRecordEntry[] = stats.cohorts.map((cohort) => ({
    teamName: cohort.teamName,
    problemCode: cohort.problemCode,
    track: cohort.track,
    status: "Active",
    outcome: cohort.problemTitle,
  }));

  const entries = [...derived, ...trackRecord.filter((r) => !derived.some((d) => d.teamName === r.teamName))];

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-brand-sand pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
          <TrophyIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-brand-deep">Engagement Track Record</h3>
          <p className="mt-0.5 text-xs text-brand-muted">
            Teams you are actively engaged with, and historical mentoring outcomes.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-brand-sand bg-brand-cream p-6 text-center text-xs font-medium text-brand-muted">
          No engagement recorded yet. Once a faculty mentor links teams to you, they will appear here.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {entries.map((entry, i) => (
            <div
              key={`${entry.problemCode}-${i}`}
              className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-brand-cream/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">
                  {entry.problemCode || `Engagement ${i + 1}`}
                  {entry.teamName ? ` • Team ${entry.teamName}` : ""}
                  {entry.track ? ` • ${entry.track}` : ""}
                </p>
                <h4 className="mt-1 text-sm font-bold text-brand-deep">{entry.outcome}</h4>
              </div>
              <span className="inline-flex shrink-0 items-center self-start rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-approved sm:self-center">
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}