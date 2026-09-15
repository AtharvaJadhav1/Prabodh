"use client";

import { useState } from "react";
import { useTeam } from "./TeamProvider";
import { LockIcon, ChevronUpIcon } from "./icons";

export default function ProblemStatementCard() {
  const { team } = useTeam();
  const [expanded, setExpanded] = useState(false);
  const idea = team?.ideaSubmissions?.[0];
  const ps = team?.problemStatement ?? idea?.problemStatement;
  const locked = Boolean(team?.problemStatement);

  if (!ps) {
    return (
      <section className="rounded-2xl border border-brand-softline bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Selected Problem Statement</p>
        <h3 className="mt-2 text-lg font-bold text-brand-deep">None locked yet</h3>
        <p className="mt-2 text-sm text-brand-muted">
          Rank problem statement preferences on the Problem Statements page. Your mentor will lock the final choice here
          after review.
        </p>
      </section>
    );
  }

  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-brand-deep" />
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">Assigned Problem Statement</p>
          {locked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-deep/20 bg-brand-deep/10 px-2.5 py-1 text-xs font-semibold text-brand-deep">
              <LockIcon className="h-3.5 w-3.5 text-brand-primary" /> Locked &amp; Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-800">
              {idea?.status ?? "Selected"}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-brand-softline bg-[#FAF7F2] px-2 py-0.5 font-mono text-xs font-bold text-brand-deep">
            {ps.code}
          </span>
          <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#C25E26]">
            {ps.theme}
          </span>
        </div>

        <h3 className="mb-2 mt-3 text-lg font-extrabold leading-snug text-brand-deep sm:text-xl">{ps.title}</h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-brand-charcoal/80">{ps.description}</p>

        <div className="mt-4 flex items-center gap-2 border-t border-brand-softline/60 pt-3 text-xs text-brand-muted">
          <span className="h-2 w-2 rounded-full bg-brand-deep" /> Final Project Submission Track
        </div>

        {expanded ? (
          <div className="mt-4 space-y-3 rounded-xl border border-brand-softline/70 bg-[#FAF7F2]/60 p-4">
            <SpecRow label="Organisation" value={ps.organisation} />
            <SpecRow label="Category" value={ps.category} capitalize />
            <SpecRow label="Tech Stack" value={idea?.techStack ?? "Not specified"} />
            {idea?.abstract ? <SpecRow label="Abstract" value={idea.abstract} /> : null}
            {idea?.feasibilityNotes ? <SpecRow label="Feasibility Notes" value={idea.feasibilityNotes} /> : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1.5 pt-2 text-xs font-bold text-[#C25E26] transition-colors hover:text-[#A84E1D]"
      >
        <ChevronUpIcon className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Hide Details" : "View Full Details"}
      </button>
    </section>
  );
}

function SpecRow({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-medium leading-relaxed text-brand-deep ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}