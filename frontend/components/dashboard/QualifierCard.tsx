"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamProvider";
import { SparklesIcon } from "./icons";

export default function QualifierCard() {
  const { team } = useTeam();
  const [resultsText, setResultsText] = useState<string | null>(null);

  useEffect(() => {
    if (!team?.id) return;
    void api<{ results: Array<{ weightedScore: string; rank?: number; stage: { name: string } }> }>(`/teams/${team.id}/my-results`)
      .then((data) => {
        if (!data.results?.length) setResultsText(null);
        else {
          setResultsText(
            data.results.map((r) => `${r.stage.name}: ${r.weightedScore}${r.rank ? ` (#${r.rank})` : ""}`).join(" · "),
          );
        }
      })
      .catch(() => setResultsText(null));
  }, [team?.id]);

  return (
    <section className="rounded-2xl bg-brand-deep p-5 text-white sm:p-6">
      <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-brand-amber">
        <SparklesIcon className="h-4 w-4" /> TRL Framework Overview
      </h2>
      {resultsText !== null && (
        <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs">{resultsText}</p>
      )}
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
          <ul className="space-y-1.5 text-justify text-[11px] leading-relaxed text-white/80 sm:text-xs">
            <li>
              <span className="font-semibold text-brand-amber">TRL 1–3 (Ideation to PoC) —</span> Fundamental research,
              concept formulation, and basic analytical/experimental proof-of-concept.
            </li>
            <li>
              <span className="font-semibold text-brand-amber">TRL 4–6 (Validation &amp; Prototype) —</span> Component
              validation in lab environments transitioning into functional field prototypes.
            </li>
            <li>
              <span className="font-semibold text-brand-amber">TRL 7–8 (Demonstration &amp; Pre-Deployment) —</span>{" "}
              Full-scale prototype demo in live operational environments and system qualification.
            </li>
            <li>
              <span className="font-semibold text-brand-amber">TRL 9 (Market &amp; Deployment) —</span> Fully proven,
              manufactured, and deployed commercialized solution ready for real-world adoption.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
