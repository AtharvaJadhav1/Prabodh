"use client";

import { useEffect, useRef, useState } from "react";
import { useTeam, type PsPreferenceInput } from "../TeamProvider";
import { XIcon, LockIcon, ClockIcon } from "../icons";
import ProblemStatementTabs from "./ProblemStatementTabs";

export type CatalogPreference = {
  kind: "catalog";
  psId: string;
  code: string;
  title: string;
  theme: string;
  category: string;
  organisation: string;
  description: string;
};

export type ManualPreference = {
  kind: "manual";
  title: string;
  theme: string;
  category: "software" | "hardware";
  organisation: string;
  description: string;
};

type Slot = CatalogPreference | ManualPreference;

export default function PreferenceSlotsPanel() {
  const { team, isLead, submitPreferences } = useTeam();
  const idea = team?.ideaSubmissions?.[0];
  const locked = Boolean(team?.problemStatement) || idea?.status === "locked";

  const [slots, setSlots] = useState<(Slot | null)[]>([null, null, null]);
  const [openRank, setOpenRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !team) return;
    initializedRef.current = true;
    const fromServer: (Slot | null)[] = [null, null, null];
    for (const pref of team.psPreferences ?? []) {
      const idx = pref.rank - 1;
      if (idx < 0 || idx > 2 || pref.status === "rejected") continue;
      if (pref.problemStatement) {
        fromServer[idx] = {
          kind: "catalog",
          psId: pref.problemStatement.id,
          code: pref.problemStatement.code,
          title: pref.problemStatement.title,
          theme: pref.problemStatement.theme,
          category: pref.problemStatement.category,
          organisation: pref.problemStatement.organisation,
          description: pref.problemStatement.description,
        };
      } else {
        fromServer[idx] = {
          kind: "manual",
          title: pref.title ?? "Untitled proposal",
          theme: pref.theme ?? "",
          category: (pref.category as "software" | "hardware") ?? "software",
          organisation: pref.organisation ?? "Student Innovation",
          description: pref.description ?? "",
        };
      }
    }
    setSlots(fromServer);
  }, [team]);

  if (locked) return null;

  const usedPsIds = slots.filter((s): s is CatalogPreference => s?.kind === "catalog").map((s) => s.psId);
  const hasSubmittedBefore = (team?.psPreferences?.length ?? 0) > 0;
  const filledCount = slots.filter(Boolean).length;

  const handlePick = (rank: number, slot: Slot) => {
    setSlots((prev) => {
      const next = [...prev];
      next[rank - 1] = slot;
      return next;
    });
    setOpenRank(null);
    setError("");
    setMessage("");
  };

  const handleRemove = (rank: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[rank - 1] = null;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!isLead || filledCount === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const preferences: PsPreferenceInput[] = slots
        .map((slot, i) => {
          if (!slot) return null;
          const rank = i + 1;
          return slot.kind === "catalog"
            ? { rank, psId: slot.psId }
            : { rank, title: slot.title, theme: slot.theme, category: slot.category, organisation: slot.organisation, description: slot.description };
        })
        .filter((p): p is PsPreferenceInput => p !== null);
      await submitPreferences(preferences);
      setMessage("Preferences submitted for mentor review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit preferences");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div>
        <h3 className="text-lg font-bold text-brand-deep">Rank Your Problem Statement Preferences</h3>
        <p className="mt-1 max-w-2xl text-sm text-brand-muted">
          Pick up to 3 problem statements, in order of preference. Your faculty mentor will review all of them and
          lock exactly one as your team&apos;s official problem statement.
        </p>
      </div>

      {hasSubmittedBefore ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-amber/30 bg-brand-amber/20 px-4 py-2.5 text-sm font-semibold text-brand-deep">
          <ClockIcon className="h-4 w-4 text-brand-primary" />
          Preferences submitted — awaiting mentor review. You can update them below until your mentor decides.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((rank) => {
          const slot = slots[rank - 1];
          return (
            <div
              key={rank}
              className="flex flex-col gap-2 rounded-xl border border-brand-softline bg-brand-canvas/40 p-4"
            >
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
                Preference #{rank}
              </span>
              {slot ? (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">
                    {slot.kind === "catalog" ? `Catalog · ${slot.code}` : "Custom Proposal"}
                  </span>
                  <h4 className="text-sm font-bold text-brand-deep">{slot.title}</h4>
                  <p className="line-clamp-2 text-xs text-brand-muted">{slot.description}</p>
                  {isLead ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(rank)}
                      className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg border border-brand-softline px-2.5 py-1 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-red-500/40 hover:text-red-600"
                    >
                      <XIcon className="h-3 w-3" /> Remove
                    </button>
                  ) : null}
                </>
              ) : isLead ? (
                <button
                  type="button"
                  onClick={() => setOpenRank(rank)}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-softline py-3 text-xs font-bold text-brand-muted transition-colors hover:border-brand-primary/50 hover:text-brand-primary"
                >
                  + Add Preference
                </button>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-muted">
                  <LockIcon className="h-3 w-3" /> Not set
                </span>
              )}
            </div>
          );
        })}
      </div>

      {openRank !== null ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-primary/30 bg-brand-cream/40 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-brand-deep">Choose Preference #{openRank}</h4>
            <button
              type="button"
              onClick={() => setOpenRank(null)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-muted hover:text-brand-deep"
            >
              <XIcon className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
          <ProblemStatementTabs
            targetRank={openRank}
            usedPsIds={usedPsIds}
            onPick={(pref) => handlePick(openRank, pref)}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}

      {isLead ? (
        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            disabled={filledCount === 0 || busy}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Submitting…" : hasSubmittedBefore ? "Update Preferences" : "Submit Preferences for Mentor Review"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
