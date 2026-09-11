"use client";

import { useState } from "react";
import { LockIcon, InfoIcon } from "../icons";
import { useTeam } from "../TeamProvider";

export default function ManualEntryForm() {
  const { team } = useTeam();
  const idea = team?.ideaSubmissions?.[0];
  const locked = Boolean(team?.problemStatement) || idea?.status === "locked";
  const [title, setTitle] = useState(team?.problemStatement?.title ?? "");
  const [track, setTrack] = useState(team?.problemStatement?.category ?? "");
  const [domainFit, setDomainFit] = useState(team?.problemStatement?.theme ?? "");
  const [methodology, setMethodology] = useState(idea?.abstract ?? "");

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          Student Innovation Track
        </span>
        <h3 className="mt-1 text-lg font-bold text-brand-deep">Manual Problem Statement Proposal</h3>
        <p className="mt-1 max-w-2xl text-sm text-brand-muted">
          Original student-innovation ideas are recorded after you lock an official repository statement, or via
          institute process. This form reflects your live team idea when one exists.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-sm text-brand-muted">
        <InfoIcon className="h-5 w-5 shrink-0 text-brand-primary" />
        <span>
          {locked
            ? `A problem statement is already attached${team?.problemStatement?.code ? ` (${team.problemStatement.code})` : ""}.`
            : "No problem statement is locked yet. Browse the official repository to select one."}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Problem Statement Title</label>
          <input
            type="text"
            disabled
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="None selected"
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Track Category</label>
          <input
            type="text"
            disabled
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="—"
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Domain Fit</label>
          <input
            type="text"
            disabled
            value={domainFit}
            onChange={(e) => setDomainFit(e.target.value)}
            placeholder="—"
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Abstract / methodology</label>
          <textarea
            disabled
            rows={4}
            value={methodology}
            onChange={(e) => setMethodology(e.target.value)}
            placeholder="Appears after an idea is submitted."
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm leading-relaxed text-brand-deep cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-xl bg-brand-sand px-5 py-2.5 text-sm font-bold text-brand-muted/60 cursor-not-allowed"
        >
          <LockIcon className="h-4 w-4" />
          {locked ? "Locked on official repository" : "Select a repository PS to continue"}
        </button>
      </div>
    </div>
  );
}
