"use client";

import { useEffect, useState } from "react";
import { useTeam } from "./TeamProvider";
import { TrashIcon, XIcon } from "./icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onDisbanded: () => void;
};

/** Confirms and performs an accidental team's self-undo — only ever rendered while eligible. */
export default function UndoTeamModal({ open, onClose, onDisbanded }: Props) {
  const { teamName, members, disbandTeam } = useTeam();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const hasOtherMembers = members.filter((m) => m.status === "Verified").length > 1;

  useEffect(() => {
    if (!open) return;
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

  async function handleConfirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await disbandTeam();
      onDisbanded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo this team.");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2A1408]/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Undo team creation"
        className="relative w-full max-w-md rounded-2xl max-sm:max-h-[90dvh] max-sm:overflow-y-auto border border-brand-softline bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-softline px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <TrashIcon className="h-5 w-5 shrink-0 text-red-600" />
            <h3 className="text-sm font-bold text-brand-deep">Undo Team Creation?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep disabled:opacity-60"
            aria-label="Close dialog"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="break-words text-sm text-brand-muted">
            Are you sure you want to undo and dissolve <span className="font-semibold text-brand-deep">{teamName}</span>?
            All pending invitations will be cancelled, and you will return to an unassigned status.
          </p>

          {hasOtherMembers ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Other members have already joined this team. Disbanding will remove all members from {teamName}.
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
              disabled={pending}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Disbanding…" : "Yes, Disband Team"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
