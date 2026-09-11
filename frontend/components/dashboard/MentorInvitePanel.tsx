"use client";

import { useEffect, useState } from "react";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, SendIcon, ClockIcon } from "./icons";

export default function MentorInvitePanel() {
  const { team, isLead, sendFacultyInvite, revokeFacultyInvite, facultyDirectory, loadFacultyDirectory } = useTeam();
  const assignments = team?.mentorAssignments ?? [];
  const pending = (team?.mentorInvites ?? []).filter((i) => i.inviteStatus === "pending");
  const [email, setEmail] = useState("");
  const [mentorType, setMentorType] = useState<"institute" | "industry">("institute");
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
      await sendFacultyInvite(trimmed, mentorType);
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
          Dual mentorship
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Team leaders invite institute and industry mentors by email. Mentors accept from their faculty inbox.
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
                <p className="text-xs text-brand-muted">
                  {a.mentorType} · {a.mentor.email}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                  <CheckIcon className="h-3.5 w-3.5" /> Active assignment
                </span>
              </li>
            ))}
            {pending.map((i) => (
              <li key={i.id} className="rounded-xl border border-brand-softline p-4">
                <p className="text-sm font-bold text-brand-deep">{i.mentor?.fullName ?? i.invitedEmail}</p>
                <p className="text-xs text-brand-muted">
                  {i.mentorType} · {i.invitedEmail}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-primary">
                  <ClockIcon className="h-3.5 w-3.5" /> Invite sent — awaiting acceptance
                </span>
                {isLead ? (
                  <button
                    type="button"
                    onClick={() => revokeFacultyInvite(i.id)}
                    className="mt-2 text-xs font-semibold text-danger hover:underline"
                  >
                    Revoke invite
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLead ? (
        <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-brand-deep">Invite a mentor by email</h3>
          <p className="mt-1 text-xs text-brand-muted">
            Use a seeded faculty email such as neha.kulkarni@mituniversity.edu.in
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={mentorType}
              onChange={(e) => setMentorType(e.target.value as "institute" | "industry")}
              className="rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-xs font-semibold text-brand-deep"
            >
              <option value="institute">Institute mentor</option>
              <option value="industry">Industry mentor</option>
            </select>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="faculty.email@mituniversity.edu.in"
              className="w-full rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-sm text-brand-deep outline-none focus:border-brand-primary focus:bg-white"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSend()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              <SendIcon className="h-4 w-4" /> Send
            </button>
          </div>
          {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
          {success ? <p className="mt-2 text-xs font-bold text-brand-approved">{success}</p> : null}

          <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-muted">Faculty directory</h4>
          <ul className="mt-3 divide-y divide-brand-softline rounded-xl border border-brand-softline">
            {facultyDirectory
              .filter((f) =>
                mentorType === "industry" ? f.platformRole === "industry_mentor" : f.platformRole === "institute_mentor",
              )
              .map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-brand-deep">{f.fullName}</p>
                    <p className="text-[11px] text-brand-muted">
                      {f.email}
                      {f.department ? ` · ${f.department}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSend(f.email)}
                    className="rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary"
                  >
                    Invite
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
