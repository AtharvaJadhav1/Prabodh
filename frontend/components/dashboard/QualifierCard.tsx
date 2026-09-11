"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamProvider";
import { SparklesIcon } from "./icons";

export default function QualifierCard() {
  const { team, stages } = useTeam();
  const [resultsNote, setResultsNote] = useState("Results appear here after admin publish.");

  useEffect(() => {
    if (!team) return;
    void api<{ results: Array<{ weightedScore: string; rank?: number; stage: { name: string } }> }>(`/teams/${team.id}/my-results`)
      .then((data) => {
        if (!data.results?.length) setResultsNote("No published results yet.");
        else {
          setResultsNote(
            data.results.map((r) => `${r.stage.name}: ${r.weightedScore}${r.rank ? ` (#${r.rank})` : ""}`).join(" · "),
          );
        }
      })
      .catch(() => setResultsNote("Results are not published yet."));
  }, [team]);

  return (
    <section className="rounded-2xl bg-brand-deep p-5 text-white sm:p-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-brand-amber" />
        <h2 className="text-base font-bold">Stage tracker & results</h2>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-white/85">
        {stages.map((s) => {
          const st = team?.stageStatuses?.find((x) => x.stage.id === s.id);
          return (
            <li key={s.id} className="flex items-center justify-between">
              <span>{s.name}</span>
              <span className="text-xs font-bold text-brand-amber">{st?.status ?? "not_started"}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs">{resultsNote}</p>
    </section>
  );
}
