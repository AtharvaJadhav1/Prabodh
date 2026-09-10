"use client";

import type { ComponentType } from "react";
import { useMentorProfile } from "./MentorProfileProvider";
import { TrophyIcon, PencilIcon } from "../dashboard/icons";

const resultStyles: Record<string, { badge: string; icon?: ComponentType<{ className?: string }> }> = {
  Winner: { badge: "bg-brand-approved/10 text-brand-approved" },
  "Runner-up": { badge: "bg-brand-lightOrange text-brand-primary" },
  Finalist: { badge: "bg-brand-deep/10 text-brand-deep" },
  Qualified: { badge: "bg-brand-sand text-brand-muted" },
};

export default function MentorTrackRecordPanel() {
  const { profile, openDrawer } = useMentorProfile();
  const { trackRecord } = profile;

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-brand-sand pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
            <TrophyIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-deep">Track Record</h3>
            <p className="mt-0.5 text-xs text-brand-muted">
              Historical mentoring outcomes and hackathon results.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openDrawer("record")}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Edit Track Record
        </button>
      </div>

      {trackRecord.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-brand-sand bg-brand-cream p-6 text-center text-xs font-medium text-brand-muted">
          No track record entries yet. Click &quot;Edit Track Record&quot; to add your first result.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {trackRecord.map((entry, i) => {
            const style = resultStyles[entry.result] ?? resultStyles.Qualified;
            return (
              <div
                key={`${entry.season}-${i}`}
                className="flex flex-col gap-3 rounded-xl border border-brand-sand bg-brand-cream/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">
                    {entry.season}
                    {entry.teamName ? ` • Team ${entry.teamName}` : ""}
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-brand-deep">{entry.outcome}</h4>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:self-center ${style.badge}`}
                >
                  {entry.result}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}