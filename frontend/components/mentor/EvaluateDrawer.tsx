"use client";

import { useEffect, useState } from "react";
import { api, apiPost } from "../../lib/api";
import type { PortalStage } from "../../lib/types";
import type { MentorGroup } from "../../data/mentorDashboard";

type Props = {
  group: MentorGroup;
  open: boolean;
  onClose: () => void;
};

export default function EvaluateDrawer({ group, open, onClose }: Props) {
  const [stages, setStages] = useState<PortalStage[]>([]);
  const [stageId, setStageId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    void api<PortalStage[]>("/stages").then((rows) => {
      setStages(rows);
      const first = rows.find((s) => s.isActive) ?? rows[0];
      if (first) setStageId(first.id);
    });
  }, [open]);

  if (!open) return null;
  const stage = stages.find((s) => s.id === stageId);
  const teamUuid = group.id;
  if (!teamUuid) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5">
        <h3 className="text-lg font-bold text-brand-deep">Score {group.teamName}</h3>
        <p className="text-xs text-brand-muted">{group.problemTitle}</p>
        <label className="mt-4 block text-xs font-bold uppercase">Stage</label>
        <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-sand px-3 py-2 text-sm">
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="mt-4 space-y-3">
          {(stage?.rubrics ?? []).map((r) => (
            <label key={r.id} className="block text-sm">
              <span className="font-semibold text-brand-deep">
                {r.criteria} ({String(r.weightage)}%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-xl border border-brand-sand px-3 py-2"
                value={scores[r.id] ?? ""}
                onChange={(e) => setScores((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-xl border border-brand-sand p-3 text-sm"
          placeholder="Feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border px-3 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex-1 rounded-xl bg-brand-primary px-3 py-2 text-sm font-bold text-white"
            onClick={async () => {
              if (!stage) return;
              setBusy(true);
              setError("");
              try {
                for (const r of stage.rubrics) {
                  await apiPost("/evaluations", {
                    teamId: teamUuid,
                    stageId: stage.id,
                    rubricId: r.id,
                    score: scores[r.id] ?? 0,
                    feedback,
                  });
                }
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not submit");
              } finally {
                setBusy(false);
              }
            }}
          >
            Submit scores
          </button>
        </div>
      </div>
    </div>
  );
}
