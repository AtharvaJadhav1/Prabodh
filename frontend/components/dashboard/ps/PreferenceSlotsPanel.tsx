"use client";

import { useEffect, useState } from "react";
import { useTeam, type PsPreferenceInput } from "../TeamProvider";
import { XIcon, LockIcon, ClockIcon, CheckIcon, UserPlusIcon } from "../icons";
import ProblemStatementTabs from "./ProblemStatementTabs";
import RepositoryBrowser from "./RepositoryBrowser";
import CreateTeamModal from "../CreateTeamModal";
import ConfirmDialog from "../ConfirmDialog";

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
  const { team, isLead, role, savePreferences, submitPreferences } = useTeam();
  const idea = team?.ideaSubmissions?.[0];
  const locked = Boolean(team?.problemStatement) || idea?.status === "locked";
  /**
   * Teamless students get the full catalog, just not the ranking step. Gating on `teamId` /
   * NO_TEAM rather than on TeamStatus: every team starts as `forming` and nothing in the backend
   * ever moves it to `active`, so treating `forming` as "not ready" would make preferences
   * unreachable for every new team. `forming` is mutable and `savePreferences` accepts it.
   */
  const hasTeam = Boolean(team?.id) && role !== "NO_TEAM";

  const [slots, setSlots] = useState<(Slot | null)[]>([null, null, null]);
  const [openRank, setOpenRank] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showNoMentor, setShowNoMentor] = useState(false);
  const [gatePs, setGatePs] = useState<CatalogPreference | null>(null);
  const prefsKey = JSON.stringify(team?.psPreferences ?? []);
  /**
   * Statement the student picked while teamless, waiting for a team to exist. Held in state and
   * applied by its own effect rather than inside the hydration effect below: creating a team
   * changes `team.id`, which rebuilds every slot from the server, so the carry has to be applied
   * after that rebuild. Two separate effects make the ordering irrelevant instead of relying on
   * whether React has flushed the `setTeam` from `createTeam` yet.
   */
  const [carried, setCarried] = useState<Slot | null>(null);

  useEffect(() => {
    if (!team) return;
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
  }, [team?.id, prefsKey]);

  useEffect(() => {
    if (!team || !carried) return;
    // Rank 1 only, and only if nothing is already there — a preference that came back from the
    // server always outranks the carried-over statement.
    setSlots((prev) => (prev[0] ? prev : [carried, prev[1], prev[2]]));
    setCarried(null);
  }, [team, carried]);

  if (locked && hasTeam) return null;

  const usedPsIds = slots.filter((s): s is CatalogPreference => s?.kind === "catalog").map((s) => s.psId);
  const prefs = team?.psPreferences ?? [];
  const hasSubmitted = prefs.some((p) => p.status === "submitted");
  const hasApproved = prefs.some((p) => p.status === "approved");
  const hasDraft = prefs.some((p) => p.status === "saved");
  const filledCount = slots.filter(Boolean).length;

  const preferencesPayload = (): PsPreferenceInput[] =>
    slots
      .map((slot, i) => {
        if (!slot) return null;
        const rank = i + 1;
        return slot.kind === "catalog"
          ? { rank, psId: slot.psId }
          : { rank, title: slot.title, theme: slot.theme, category: slot.category, organisation: slot.organisation, description: slot.description };
      })
      .filter((p): p is PsPreferenceInput => p !== null);

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

  /**
   * Catalog click with no team: hold the statement, raise the create-team gate, and carry the
   * statement into slot #1 once the team exists. Browsing stays untouched — only this action is
   * intercepted.
   */
  const handleBrowseSelect = (pref: CatalogPreference) => {
    setGatePs(pref);
  };

  const handleTeamCreated = () => {
    setCarried(gatePs);
    setMessage(
      gatePs
        ? `“${gatePs.code} — ${gatePs.title}” is pre-filled as Preference #1. Save when you're ready.`
        : "Team created. Rank your preferences below.",
    );
    setGatePs(null);
  };

  const handleRemove = (rank: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[rank - 1] = null;
      return next;
    });
  };

  const handleSave = async () => {
    if (!isLead || filledCount === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await savePreferences(preferencesPayload());
      setMessage("Preferences saved. Send them to your mentor for review whenever you're ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!isLead || filledCount === 0) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await submitPreferences(preferencesPayload());
      if (result.sent) {
        setMessage("Preferences submitted for mentor review.");
      } else {
        setShowNoMentor(true);
        setMessage("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit preferences");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      {hasTeam ? (
        <div>
          <h3 className="text-lg font-bold text-brand-deep">Rank Your Problem Statement Preferences</h3>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            Pick up to 3 problem statements, in order of preference. Your faculty mentor will review all of them and
            lock exactly one as your team&apos;s official problem statement.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-brand-softline bg-brand-cream px-4 py-3">
          <UserPlusIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
          <div>
            <h3 className="text-base font-bold text-brand-deep">Browse available challenges below</h3>
            <p className="mt-0.5 text-sm text-brand-muted">
              To lock or rank preferences for your project, create or join a team.
            </p>
          </div>
        </div>
      )}

      {hasApproved || hasSubmitted ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-amber/30 bg-brand-amber/20 px-4 py-2.5 text-sm font-semibold text-brand-deep">
          <ClockIcon className="h-4 w-4 text-brand-primary" />
          {hasApproved
            ? "Your problem statement is locked. This page is now read-only."
            : "Preferences submitted — awaiting mentor review. You can update them below until your mentor decides."}
        </div>
      ) : hasDraft ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm font-semibold text-brand-deep">
          <CheckIcon className="h-4 w-4 text-brand-approved" />
          Preferences saved as a draft. Send them to your mentor once your team has an active mentor.
        </div>
      ) : null}

      {hasTeam ? (
        <>
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
                  <p className="line-clamp-2 text-xs text-brand-muted hyphens-none">{slot.description}</p>
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
          {!isLead ? (
            /* Non-lead members get the same catalog to read, with selection still owned by the
               lead — browsing is for everyone, the button is not. */
            <RepositoryBrowser targetRank={1} usedPsIds={[]} onPick={() => {}} intent="readonly" />
          ) : null}
        </>
      ) : (
        <>
          {gatePs ? (
            <div className="flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm font-semibold text-brand-deep">
              <ClockIcon className="h-4 w-4 text-brand-primary" />
              Finish creating your team to rank <span className="font-bold">{gatePs.code}</span> as a
              preference.
            </div>
          ) : null}
          {/* Full catalog, same component the lead flow uses, so the browse and rank views
              cannot drift apart in search, filters, or card layout. */}
          <RepositoryBrowser targetRank={1} usedPsIds={[]} onPick={handleBrowseSelect} intent="gate" />
        </>
      )}

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-green-700">{message}</p> : null}

      {hasTeam && isLead ? (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={filledCount === 0 || busy}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Preferences"}
          </button>
          <button
            type="button"
            disabled={filledCount === 0 || busy}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Submitting…" : hasSubmitted ? "Update & Submit Preferences" : "Submit for Mentor Review"}
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={showNoMentor}
        title="No active mentor yet"
        message="You don't have a mentor to send this to right now. Your preferences are saved in your dashboard and will be sent to your mentor as soon as one accepts your team."
        confirmLabel="Got it"
        onConfirm={() => setShowNoMentor(false)}
        onCancel={() => setShowNoMentor(false)}
      />

      <CreateTeamModal
        open={gatePs !== null}
        onClose={() => setGatePs(null)}
        contextLine={gatePs ? `Selected: ${gatePs.code} — ${gatePs.title}` : undefined}
        onCreated={handleTeamCreated}
      />
    </div>
  );
}
