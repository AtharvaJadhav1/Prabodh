"use client";

import { useEffect, useState } from "react";
import { useTeam } from "./TeamProvider";
import { useAuth } from "../auth/AuthProvider";
import { UsersRoundIcon, XIcon } from "./icons";

type Choice = "reject" | "switch" | null;

type Props = {
  open: boolean;
  onClose: () => void;
  inviteId: string;
  newTeamName: string;
};

/**
 * Shown instead of a plain "Accept" when the student already belongs to a team. Mirrors
 * CreateTeamModal's dialog shell (backdrop, header, Escape-to-close) with three outcomes:
 * decline, or leave the current team to join the new one — joining both is intentionally not
 * offered, since the rest of the platform assumes one active team per student.
 */
export default function TeamInviteDecisionModal({ open, onClose, inviteId, newTeamName }: Props) {
  const { session } = useAuth();
  const { teamName: currentTeamName, isLead, members, declineInvite, switchTeams } = useTeam();
  const [choice, setChoice] = useState<Choice>(null);
  const [successorId, setSuccessorId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const teammates = members.filter((m) => m.status === "Verified" && m.id !== session?.userId);
  const soloLead = isLead && teammates.length === 0;
  const needsSuccessor = isLead && teammates.length > 0;

  useEffect(() => {
    if (!open) return;
    setChoice(null);
    setSuccessorId("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = choice === "reject" || (choice === "switch" && (!needsSuccessor || successorId !== ""));

  async function handleConfirm() {
    if (!choice || pending) return;
    setPending(true);
    setError("");
    try {
      if (choice === "reject") {
        await declineInvite(inviteId);
      } else {
        await switchTeams(inviteId, needsSuccessor ? successorId : undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process your decision.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2A1408]/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Respond to team invitation"
        className="relative w-full max-w-lg rounded-2xl max-sm:max-h-[90dvh] max-sm:overflow-y-auto border border-brand-softline bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-softline px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <UsersRoundIcon className="h-5 w-5 shrink-0 text-brand-primary" />
            <h3 className="min-w-0 break-words text-sm font-bold text-brand-deep">Incoming Team Invitation from {newTeamName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
            aria-label="Close invitation dialog"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="break-words text-sm text-brand-muted">
            You are currently part of <span className="font-semibold text-brand-deep">{currentTeamName}</span>. How
            would you like to proceed?
          </p>

          <div className="space-y-2">
            <ChoiceCard
              selected={choice === "reject"}
              onClick={() => setChoice("reject")}
              emoji="❌"
              title="Decline Invitation"
              description={`Stay in your current team and decline this request.`}
            />
            <ChoiceCard
              selected={choice === "switch"}
              onClick={() => setChoice("switch")}
              emoji="🔄"
              title="Switch Teams"
              description={`Leave ${currentTeamName} and become a member of ${newTeamName}.`}
            />
          </div>

          {choice === "switch" && needsSuccessor ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
              <p className="text-xs font-semibold text-amber-800">
                As Team Lead, you must transfer leadership before leaving.
              </p>
              <label htmlFor="switch-successor" className="mt-2 block text-xs font-semibold text-brand-deep">
                Select new Team Lead
              </label>
              <select
                id="switch-successor"
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                disabled={pending}
                className="mt-1 w-full rounded-lg border border-brand-softline px-3 py-2 text-sm text-brand-deep outline-none focus:border-brand-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  Select new Team Lead...
                </option>
                {teammates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {choice === "switch" && soloLead ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Notice: Since you are the only member, {currentTeamName} will be disbanded.
            </p>
          ) : null}

          {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex-1 rounded-xl border border-brand-softline px-4 py-2.5 text-sm font-semibold text-brand-muted transition hover:bg-brand-cream disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending || !choice || !canConfirm}
              className="flex-1 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Processing…" : "Confirm Choice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  emoji,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        selected ? "border-brand-primary bg-brand-primary/5" : "border-brand-softline hover:border-brand-primary/40"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-bold text-brand-deep">
        <span>{emoji}</span>
        <span>{title}</span>
      </div>
      <p className="mt-1 text-xs text-brand-muted">{description}</p>
    </button>
  );
}
