"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, SendIcon, ClockIcon } from "./icons";
import MentorLinkedinIcon from "./MentorLinkedinIcon";
import IndustryMentorsDirectory from "./IndustryMentorsDirectory";

function mentorKindLabel(kind: string) {
  return kind === "industry" ? "Industry Mentor" : "Institute Mentor";
}

export default function MentorInvitePanel() {
  const { team, isLead, mentorLocked, sendFacultyInvite, revokeFacultyInvite, facultyDirectory, loadFacultyDirectory } =
    useTeam();
  const assignments = team?.mentorAssignments ?? [];
  // Slot by mentorType so at most one card per slot ever renders, even if the
  // API ever returns more than one active row for the same type.
  const instituteAssignment = assignments.find((a) => a.mentorType === "institute");
  const industryAssignment = assignments.find((a) => a.mentorType === "industry");
  const slottedAssignments = [instituteAssignment, industryAssignment].filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );
  const pending = (team?.mentorInvites ?? []).filter((i) => i.inviteStatus === "pending");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const instituteLocked = mentorLocked || Boolean(instituteAssignment);
  const inviteBlocked = instituteLocked;

  const facultyOnly = useMemo(
    () =>
      facultyDirectory.filter(
        (f) => f.platformRole === "institute_mentor" || f.additionalRoles?.includes("institute_mentor"),
      ),
    [facultyDirectory],
  );

  // What the lead types in the box also searches the directory (name, email, department, institute).
  const query = email.trim().toLowerCase();
  const filteredDirectory = useMemo(() => {
    if (!query) return facultyOnly;
    return facultyOnly.filter((f) =>
      [f.fullName, f.email, f.department ?? "", f.institute ?? ""].some((v) => v.toLowerCase().includes(query)),
    );
  }, [facultyOnly, query]);
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
  // Send stays locked until the typed email matches a registered faculty account exactly.
  const matchedFaculty = facultyOnly.find((f) => f.email.trim().toLowerCase() === query) ?? null;
  const canSend = looksLikeEmail && matchedFaculty !== null && !busy && !revokingId;

  useEffect(() => {
    if (isLead) void loadFacultyDirectory();
  }, [isLead, loadFacultyDirectory]);

  const handleSend = async (targetEmail = email) => {
    const trimmed = targetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a faculty email, e.g. neha.kulkarni@mituniversity.edu.in");
      return;
    }
    if (!facultyOnly.some((f) => f.email.trim().toLowerCase() === trimmed)) {
      setError("Faculty account not found. Please contact your admin to create their account.");
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
          Invite an Institute Mentor to guide your team. The slot locks when the mentor accepts.
        </p>
        {slottedAssignments.length === 0 && pending.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-brand-softline bg-brand-cream p-5 text-center text-sm text-brand-muted">
            No mentors assigned yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {slottedAssignments.map((a) => (
              <li key={a.id} className="rounded-xl border border-brand-softline p-4">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-brand-deep [overflow-wrap:anywhere]">
                  {a.mentor.fullName}
                  <MentorLinkedinIcon url={a.mentor.linkedinUrl} name={a.mentor.fullName} />
                </p>
                <p className="text-xs text-brand-muted">{mentorKindLabel(a.mentorType)}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                  <CheckIcon className="h-3.5 w-3.5" /> Active assignment
                </span>
              </li>
            ))}
            {pending.map((i) => (
              <li key={i.id} className="rounded-xl border border-brand-softline p-3.5">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-brand-deep [overflow-wrap:anywhere]">
                  <span className="truncate">{i.mentor?.fullName ?? i.invitedEmail}</span>
                  {i.mentor ? (
                    <MentorLinkedinIcon url={i.mentor.linkedinUrl} name={i.mentor.fullName} />
                  ) : null}
                </p>
                <p className="text-xs text-brand-muted">{mentorKindLabel(i.mentorType ?? "institute")}</p>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-brand-softline pt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary">
                    <ClockIcon className="h-3.5 w-3.5" /> Invite sent — awaiting acceptance
                  </span>
                  {isLead ? (
                    <button
                      type="button"
                      disabled={revokingId !== null || busy}
                      onClick={() => {
                        setError("");
                        setSuccess("");
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

      {isLead && inviteBlocked ? <IndustryMentorsDirectory /> : null}

      {isLead && !inviteBlocked ? (
        <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-brand-deep">Invite a faculty mentor by email</h3>

          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              aria-label="Search faculty by name or email, or enter a full email to invite"
              placeholder="Search by name or email, e.g. neha.kulkarni@mituniversity.edu.in"
              className="h-10 w-full rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-sm text-brand-deep outline-none focus:border-brand-primary focus:bg-white sm:h-11"
            />
            <button
              type="submit"
              disabled={!canSend}
              title={
                canSend
                  ? "Send invite"
                  : query && looksLikeEmail
                    ? "No registered faculty account with that email."
                    : "Enter a registered faculty email to enable the invite."
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-11"
            >
              <SendIcon className="h-4 w-4" /> Send
            </button>
          </form>
          {query && looksLikeEmail && !matchedFaculty ? (
            <p className="mt-2 text-xs font-semibold text-red-700">
              Faculty account not found. Please contact your admin to create their account.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
          {success ? <p className="mt-2 text-xs font-bold text-brand-approved">{success}</p> : null}

          <h4 className="mt-6 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
            <span>Faculty directory</span>
            <span className="font-semibold normal-case tracking-normal">
              {query ? `${filteredDirectory.length} of ${facultyOnly.length} match` : `${facultyOnly.length} registered`}
            </span>
          </h4>
          <ul className="mt-3 divide-y divide-brand-softline rounded-xl border border-brand-softline">
            {filteredDirectory.length === 0 ? (
              <li className="px-4 py-3 text-xs text-brand-muted">
                {facultyOnly.length === 0
                  ? "No registered faculty yet."
                  : looksLikeEmail
                    ? "No registered faculty with that email."
                    : "No faculty match your search."}
              </li>
            ) : (
              filteredDirectory.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-brand-deep">
                      <span className="truncate">{f.fullName}</span>
                      <MentorLinkedinIcon url={f.linkedinUrl} name={f.fullName} />
                    </p>
                    <p className="truncate text-[11px] text-brand-muted">
                      {f.email}
                      {f.department ? ` · ${f.department}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || revokingId !== null}
                    onClick={() => void handleSend(f.email)}
                    className="shrink-0 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Invite
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
