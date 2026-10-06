"use client";

import { useState } from "react";
import { api, apiPost, ApiError } from "../../lib/api";
import { useAuth, wipeClientSession } from "../auth/AuthProvider";
import { SettingsIcon } from "../dashboard/icons";

type Preview = {
  email: string;
  fullName: string;
  blockers: string[];
  teamsToDelete: Array<{ id: string; name: string; memberCount: number }>;
  teamsBlocking: Array<{
    id: string;
    name: string;
    memberCount: number;
    members: Array<{ userId: string; fullName: string; email: string }>;
  }>;
  mentorAssignmentsActive: number;
  otherTeamMemberships: number;
  hasEvaluationHistory: boolean;
};

/**
 * Self-service account deletion. Irreversible and shared by every portal, so it is styled and
 * gated like DisqualifyPanel in components/teams/TeamDetailsView.tsx: consequences are spelled
 * out from a server preview, and the destructive button only unlocks once the typed text
 * matches either "DELETE" or the user's own address.
 */
export default function DangerZoneDeleteAccount() {
  const { session } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");
  const [successors, setSuccessors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const email = session?.email ?? "";
  const normalized = typed.trim().toLowerCase();
  const matches = normalized === "delete" || (!!email && normalized === email.toLowerCase());
  const blocked = (preview?.blockers.length ?? 0) > 0;
  const needsSuccessor = (preview?.teamsBlocking ?? []).some((t) => !successors[t.id]);

  async function handleOpen() {
    setError("");
    setTyped("");
    setOpen(true);
    setLoading(true);
    try {
      const result = await api<Preview>("/me/delete-preview");
      setPreview(result);
      // Pre-select the earliest-joined member (first in the list) as the suggested successor,
      // while still letting the lead change it.
      setSuccessors(
        Object.fromEntries(
          result.teamsBlocking.filter((t) => t.members.length > 0).map((t) => [t.id, t.members[0].userId]),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load account details.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError("");
    try {
      await apiPost("/me/delete", { confirm: typed, successors });
      // The account is already gone server-side, so this is a local teardown rather than a
      // logout round-trip. `location.assign` (not router.push) so no provider state or
      // in-memory session survives the navigation — the same reason logout hard-navigates.
      wipeClientSession();
      window.location.assign("/login?notice=account-deleted");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete your account.");
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6 max-sm:p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-ink"
        aria-expanded={settingsOpen}
      >
        <SettingsIcon className="h-5 w-5 text-gray-500" />
        Account Settings
      </button>

      {!settingsOpen ? null : (
        <div className="mt-4">
          <h2 className="text-base font-bold text-red-700">Danger Zone</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Permanently delete your account and everything tied to it. This cannot be undone.
          </p>

          {!open ? (
            <button
              type="button"
              onClick={handleOpen}
              disabled={loading}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Delete Account"}
            </button>
          ) : null}

          {error ? <p className="mt-3 break-words text-sm text-red-700">{error}</p> : null}

          {open && preview ? (
            <div
              role="alertdialog"
              aria-label="Delete account"
              className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4"
            >
              <p className="flex items-center gap-2 break-words text-sm font-bold text-red-700">
                Delete {preview.fullName ? `“${preview.fullName}”` : "your account"}?
              </p>

              {blocked ? (
                <>
                  <p className="mt-2 text-xs font-medium text-red-700">
                    You cannot delete your account until you resolve the following:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-red-700">
                    {preview.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xs font-medium text-red-700">
                    This permanently deletes your account and its data, and cannot be undone:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-red-700">
                    <li>Your profile, avatar and any comments you wrote</li>
                    {preview.teamsToDelete.map((t) => (
                      <li key={t.id}>
                        Team &ldquo;{t.name}&rdquo; and all of its data, since you are its only member
                      </li>
                    ))}
                    {preview.mentorAssignmentsActive > 0 ? (
                      <li>
                        Your {preview.mentorAssignmentsActive} mentor assignment
                        {preview.mentorAssignmentsActive === 1 ? "" : "s"}; those teams will need a new
                        mentor
                      </li>
                    ) : null}
                    {preview.hasEvaluationHistory ? (
                      <li>
                        Your past evaluations are kept for academic integrity, but your name and contact
                        details are permanently removed and the account can no longer sign in
                      </li>
                    ) : null}
                    {preview.otherTeamMemberships > 0 ? (
                      <li>
                        Your membership in{" "}
                        {preview.otherTeamMemberships === 1
                          ? "another team"
                          : `${preview.otherTeamMemberships} other teams`}
                        ; those teams keep going without you
                      </li>
                    ) : null}
                  </ul>
                </>
              )}

              {blocked
                ? null
                : preview.teamsBlocking.map((t) => (
                    <div key={t.id} className="mt-3">
                      <label htmlFor={`successor-${t.id}`} className="block text-xs font-semibold text-red-800">
                        Choose a new Team Lead for &ldquo;{t.name}&rdquo;
                      </label>
                      <select
                        id={`successor-${t.id}`}
                        value={successors[t.id] ?? ""}
                        onChange={(e) => setSuccessors((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        disabled={pending}
                        className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-red-900 outline-none focus:border-red-500 disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select a teammate
                        </option>
                        {t.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.fullName || m.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

              {blocked ? null : (
                <>
                  <label htmlFor="delete-account-confirm" className="mt-3 block text-xs font-semibold text-red-800">
                    Type <span className="font-mono font-bold">DELETE</span> or your email address to confirm
                  </label>
                  <input
                    id="delete-account-confirm"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoComplete="off"
                    placeholder="DELETE"
                    disabled={pending}
                    className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2 font-mono text-sm text-red-900 outline-none focus:border-red-500 disabled:opacity-60"
                  />
                  {error ? <p className="mt-2 break-words text-xs font-medium text-red-700">{error}</p> : null}
                </>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setTyped("");
                    setError("");
                  }}
                  disabled={pending}
                  className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 max-sm:py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                {!blocked ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={pending || !matches || needsSuccessor}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 max-sm:py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? "Deleting…" : "Delete my account"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}