"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeam } from "./TeamProvider";
import { PlusIcon, XIcon } from "./icons";

type CreateTeamFormProps = {
  /** Called after the team exists server-side and TeamProvider has reloaded. */
  onCreated?: () => void;
  onError?: (message: string) => void;
  autoFocus?: boolean;
};

/**
 * The team-creation form itself, extracted so the dashboard's empty state and the
 * problem-statements page's interception modal run identical logic. Both call
 * `createTeam` from TeamProvider, which posts `/teams` and reloads, so the caller only has
 * to react to completion.
 */
export function CreateTeamForm({ onCreated, onError, autoFocus }: CreateTeamFormProps) {
  const { createTeam } = useTeam();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await createTeam(trimmed);
      setName("");
      onCreated?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to create team. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={creating}
          autoFocus={autoFocus}
          placeholder="Team name"
          aria-label="Team name"
          className="w-full rounded-xl border border-brand-softline px-3 py-2.5 text-sm text-brand-deep outline-none focus:border-brand-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="shrink-0 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create team"}
        </button>
      </div>
    </form>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Problem statement the user was looking at when they hit the gate, if any. */
  contextLine?: string;
  onCreated?: () => void;
};

/**
 * Soft gate for actions that need a team. Raised from the problem-statements page when a
 * student without a team tries to select a statement, so the catalog stays browsable while
 * the ranking step stays team-scoped.
 */
export default function CreateTeamModal({ open, onClose, contextLine, onCreated }: Props) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    // The input autofocuses, so the student can name the team without reaching for the mouse.
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('[aria-label="Team name"]')?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Escape closes, matching the other dialogs in the dashboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2A1408]/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create your team"
        className="relative w-full max-w-md rounded-2xl max-sm:max-h-[90dvh] max-sm:overflow-y-auto border border-brand-softline bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-softline px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <PlusIcon className="h-5 w-5 shrink-0 text-brand-primary" />
            <h3 className="min-w-0 break-words text-sm font-bold text-brand-deep">Create your team</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
            aria-label="Close create team dialog"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-sm text-brand-muted">
            You need a team before you can rank problem statements. Create one now and we&apos;ll carry
            your selection over.
          </p>
          {contextLine ? (
            <p className="break-words rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-xs font-semibold text-brand-deep">
              {contextLine}
            </p>
          ) : null}

          <CreateTeamForm
            autoFocus
            onCreated={() => {
              onCreated?.();
              onClose();
            }}
            onError={setError}
          />

          {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}

          <p className="text-xs text-brand-muted">
            Already have an invite from a friend?{" "}
            <Link
              href="/dashboard/student/group-requests"
              className="font-bold text-brand-primary hover:underline"
            >
              Join their team instead
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}