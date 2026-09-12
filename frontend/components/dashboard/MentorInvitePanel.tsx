"use client";

import { useEffect, useState } from "react";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, SendIcon, ClockIcon } from "./icons";

export default function MentorInvitePanel() {
  const { team, isLead, mentorLocked, sendFacultyInvite, revokeFacultyInvite, facultyDirectory, loadFacultyDirectory } =
    useTeam();
  const assignments = team?.mentorAssignments ?? [];
  const pending = (team?.mentorInvites ?? []).filter((i) => i.inviteStatus === "pending");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLead) void loadFacultyDirectory();
  }, [isLead, loadFacultyDirectory]);

  const handleSend = async (targetEmail = email) => {
    const trimmed = targetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a faculty email, e.g. neha.kulkarni@mituniversity.edu.in");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await sendFacultyInvite(trimmed);
      setEmail("");
      setSuccess(`Mentor invitation sent to ${trimmed}.`);
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
          Faculty Mentor Invites
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Invites are first-come, first-served: the first faculty member to accept is locked in as your mentor, and all
          other invitations are automatically cancelled.
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
                <p className="text-xs text-brand-muted">Institute Mentor</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                  <CheckIcon className="h-3.5 w-3.5" /> Active assignment
                </span>
              </li>
            ))}
            {pending.map((i) => (
              <li key={i.id} className="rounded-xl border border-brand-softline p-3.5">
                <p className="truncate text-sm font-bold text-brand-deep">{i.mentor?.fullName ?? i.invitedEmail}</p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-brand-softline pt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary">
                    <ClockIcon className="h-3.5 w-3.5" /> Invite sent — awaiting acceptance
                  </span>
                  {isLead ? (
                    <button
                      type="button"
                      onClick={() => revokeFacultyInvite(i.id)}
                      className="shrink-0 rounded-lg border border-red-500/30 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 transition-colors hover:border-red-500/50 hover:bg-red-100"
                    >
                      Revoke Invite
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
          {mentorLocked ? (
            <>
              <h3 className="text-sm font-bold text-brand-deep">Faculty slot locked</h3>
              <p className="mt-1 text-xs text-brand-muted">
                A faculty mentor has accepted the invitation and is locked in for your team. Further invites are closed.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand-approved/30 bg-brand-approved/10 px-2.5 py-1 text-xs font-bold text-brand-approved">
                <CheckIcon className="h-3.5 w-3.5" /> Assigned / Locked
              </span>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-brand-deep">Invite a faculty mentor by email</h3>
              <p className="mt-1 text-xs text-brand-muted">
                You may invite multiple faculty members at once; the first to accept locks in the slot.
              </p>
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

              <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-muted">Faculty directory</h4>
              <ul className="mt-3 divide-y divide-brand-softline rounded-xl border border-brand-softline">
                {facultyDirectory.map((f) => (
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
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
