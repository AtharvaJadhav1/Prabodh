"use client";

import { useState } from "react";
import { useTeam } from "../TeamProvider";
import type { ManualPreference } from "./PreferenceSlotsPanel";

type Props = {
  targetRank: number;
  onPick: (pref: ManualPreference) => void;
};

export default function ManualEntryForm({ targetRank, onPick }: Props) {
  const { isLead } = useTeam();
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<"software" | "hardware">("software");
  const [domainFit, setDomainFit] = useState("");
  const [methodology, setMethodology] = useState("");
  const [techStack, setTechStack] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (title.trim().length < 5) {
      setError("Title must be at least 5 characters.");
      return;
    }
    if (domainFit.trim().length < 2) {
      setError("Domain/theme must be at least 2 characters.");
      return;
    }
    if (techStack.trim().length < 2) {
      setError("Tech stack must be at least 2 characters.");
      return;
    }
    const abstract = methodology.trim().length >= 20
      ? methodology.trim()
      : `${methodology.trim()} — student innovation proposal.`.padEnd(20, ".");
    setError("");
    onPick({
      kind: "manual",
      title: title.trim(),
      theme: domainFit.trim(),
      category: track,
      organisation: "Student Innovation",
      description: `${abstract}\n\nTech stack: ${techStack.trim()}`,
    });
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
          Student Innovation Track
        </span>
        <h3 className="mt-1 text-lg font-bold text-brand-deep">Manual Problem Statement Proposal</h3>
        <p className="mt-1 max-w-2xl text-sm text-brand-muted">
          Propose your own innovation idea as Preference #{targetRank}. Your faculty mentor will review it alongside your other picks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Problem Statement Title</label>
          <input
            type="text"
            disabled={!isLead}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your innovation title"
            className="w-full rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm text-brand-deep disabled:bg-brand-cream"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Track Category</label>
          <select
            disabled={!isLead}
            value={track}
            onChange={(e) => setTrack(e.target.value as "software" | "hardware")}
            className="w-full rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm text-brand-deep disabled:bg-brand-cream"
          >
            <option value="software">Software</option>
            <option value="hardware">Hardware</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Domain / Theme</label>
          <input
            type="text"
            disabled={!isLead}
            value={domainFit}
            onChange={(e) => setDomainFit(e.target.value)}
            placeholder="e.g. HealthTech"
            className="w-full rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm text-brand-deep disabled:bg-brand-cream"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Abstract / methodology</label>
          <textarea
            disabled={!isLead}
            rows={4}
            value={methodology}
            onChange={(e) => setMethodology(e.target.value)}
            className="w-full rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm leading-relaxed text-brand-deep disabled:bg-brand-cream"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Tech stack</label>
          <input
            type="text"
            disabled={!isLead}
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="w-full rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm text-brand-deep disabled:bg-brand-cream"
          />
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          disabled={!isLead}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {`Add to Preference #${targetRank}`}
        </button>
      </div>
    </div>
  );
}
