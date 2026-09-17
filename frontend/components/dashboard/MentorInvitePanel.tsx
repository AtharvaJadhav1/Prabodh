"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, SendIcon, ClockIcon } from "./icons";

function mentorKindLabel(kind: string) {
  return kind === "industry" ? "Industry Mentor" : "Institute Mentor";
}

export default function MentorInvitePanel() {
  const { team, isLead, mentorLocked, sendFacultyInvite, revokeFacultyInvite, facultyDirectory, loadFacultyDirectory } =
    useTeam();
  const assignments = team?.mentorAssignments ?? [];
  const pending = (team?.mentorInvites ?? []).filter((i) => i.inviteStatus === "pending");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const hasInstitute = assignments.some((a) => a.mentorType === "institute");
  const instituteLocked = mentorLocked || hasInstitute;
  const inviteBlocked = instituteLocked;

  const filteredDirectory = useMemo(
    () => facultyDirectory.filter((f) => f.platformRole === "institute_mentor"),
    [facultyDirectory],
  );

  useEffect(() => {
    if (isLead) void loadFacultyDirectory();
  }, [isLead, loadFacultyDirectory]);

  const handleSend = async (targetEmail = email) => {
    const trimmed = targetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a faculty email, e.g. neha.kulkarni@mituniversity.edu.in");
      return;
    }
    if (inviteBlocked) {
      setError("Faculty mentor slot is already locked.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await sendFacultyInvite(trimmed);
      setEmail("");
      setSuccess(`Institute mentor invitation sent to ${trimmed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send mentor invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
          <GradCapIcon className="h-5 w-5 text-brand-primary" />
          Mentor Invites
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Invite an Institute Faculty Mentor to guide your team. The slot locks when the mentor accepts.
        </p>
        {assignments.length === 0 && pending.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-brand-softline bg-brand-cream p-5 text-center text-sm text-brand-muted">
            No mentors assigned yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-xl border border-brand-softline p-4">
                <p className="text-sm font-bold text-brand-deep">{a.mentor.fullName}</p>
                <p className="text-xs text-brand-muted">{mentorKindLabel(a.mentorType)}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                  <CheckIcon className="h-3.5 w-3.5" /> Active assignment
                </span>
              </li>
            ))}
            {pending.map((i) => (
              <li key={i.id} className="rounded-xl border border-brand-softline p-3.5">
                <p className="truncate text-sm font-bold text-brand-deep">{i.mentor?.fullName ?? i.invitedEmail}</p>
                <p className="text-xs text-brand-muted">{mentorKindLabel(i.mentorType ?? "institute")}</p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-brand-softline pt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary">
                    <ClockIcon className="h-3.5 w-3.5" /> Invite sent — awaiting acceptance
                  </span>
                  {isLead ? (
                    <button
                      type="button"
                      disabled={revokingId === i.id || busy}
                      onClick={() => {
                        setRevokingId(i.id);
                        void revokeFacultyInvite(i.id)
                          .catch((err) => setError(err instanceof Error ? err.message : "Could not revoke invite"))
                          .finally(() => setRevokingId((id) => (id === i.id ? null : id)));
                      }}
                      className="shrink-0 rounded-lg border border-red-500/30 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-colors hover:border-red-500/50 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revokingId === i.id ? "Revoking…" : "Revoke Invite"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLead ? (
        <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-brand-deep">Invite a mentor by email</h3>
          <p className="mt-1 text-xs text-brand-muted">
            Faculty mentors must already have a Prabodh account (created by your nodal admin). Invite them using
            the same email they use to sign in.
          </p>

          <div className="mt-3 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-muted">Mentor type</label>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              🎓 Institute Faculty Mentor
            </div>
          </div>

          {inviteBlocked ? (
            <div className="mt-4">
              <p className="text-xs text-brand-muted">
                A faculty mentor has accepted and this slot is locked.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand-approved/30 bg-brand-approved/10 px-2.5 py-1 text-xs font-bold text-brand-approved">
                <CheckIcon className="h-3.5 w-3.5" /> Assigned / Locked
              </span>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty.email@mituniversity.edu.in"
                  className="h-10 w-full rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-sm text-brand-deep outline-none focus:border-brand-primary focus:bg-white sm:h-11"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSend()}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60 sm:h-11"
                >
                  <SendIcon className="h-4 w-4" /> Send
                </button>
              </div>
              {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
              {success ? <p className="mt-2 text-xs font-bold text-brand-approved">{success}</p> : null}

              <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-muted">
                Faculty directory
              </h4>
              <ul className="mt-3 divide-y divide-brand-softline rounded-xl border border-brand-softline">
                {filteredDirectory.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-brand-muted">
                    No registered faculty yet.
                  </li>
                ) : (
                  filteredDirectory.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand-deep">{f.fullName}</p>
                        <p className="truncate text-[11px] text-brand-muted">
                          {f.email}
                          {f.department ? ` · ${f.department}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSend(f.email)}
                        className="shrink-0 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
                      >
                        Invite
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
