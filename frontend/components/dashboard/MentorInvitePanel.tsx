"use client";

import { useState } from "react";
import { mentors } from "../../data/studentDashboard";
import { useTeam } from "./TeamProvider";
import ConfirmDialog from "./ConfirmDialog";
import {
  CalendarIcon,
  MessageIcon,
  CheckIcon,
  ClockIcon,
  UserPlusIcon,
  SendIcon,
  XIcon,
  GradCapIcon,
  LockIcon,
} from "./icons";

export default function MentorInvitePanel() {
  const {
    facultyInviteStatus,
    facultyInviteEmail,
    sendFacultyInvite,
    revokeFacultyInvite,
    isLead,
  } = useTeam();

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const handleSend = () => {
    const val = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError("Enter a valid institutional email address.");
      return;
    }
    if (!val.endsWith("@mituniversity.edu.in")) {
      setError("The faculty mentor must use an official @mituniversity.edu.in address.");
      return;
    }
    sendFacultyInvite(val);
    setEmail("");
    setError("");
    setShowForm(false);
  };

  const handleRevokeConfirm = () => {
    revokeFacultyInvite();
    setRevokeDialogOpen(false);
  };

  return (
    <div>
      <div className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
            <GradCapIcon className="h-5 w-5 text-brand-primary" />
            Faculty Mentor
          </h2>
          {facultyInviteStatus === "verified" && (
            <span className="rounded-full bg-brand-approved/10 px-3 py-1 text-xs font-bold text-brand-approved">
              Approved
            </span>
          )}
        </div>

        {facultyInviteStatus === "none" && (
          <>
            <div className="mt-4 rounded-xl border border-dashed border-brand-softline bg-brand-cream p-5 text-center">
              <p className="text-sm font-bold text-brand-deep">No Faculty Mentor Yet</p>
              <p className="mt-1 text-xs font-medium text-brand-muted">
                Invite an institute faculty member to guide your SIH problem statement track.
              </p>
            </div>

            {isLead ? (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
              >
                {showForm ? (
                  <>
                    <XIcon className="h-4 w-4" /> Cancel Invite
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4" /> Invite Faculty Mentor
                  </>
                )}
              </button>
            ) : (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-xs font-semibold text-brand-muted">
                <LockIcon className="h-4 w-4 shrink-0 text-brand-primary" />
                Mentor invites are managed by the Team Lead.
              </p>
            )}

            {showForm && isLead && (
              <form
                className="mt-4 rounded-xl border border-brand-softline bg-white p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <label htmlFor="faculty-mentor-email" className="mb-1 block text-xs font-bold text-brand-deep">
                  Faculty Institutional Email
                </label>
                <input
                  id="faculty-mentor-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="faculty.name@mituniversity.edu.in"
                  className="w-full rounded-xl border border-brand-softline bg-brand-cream py-2.5 pl-4 pr-3 text-xs font-medium text-brand-charcoal transition-all placeholder:text-brand-charcoal/40 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
                <p className="mt-1 text-[11px] text-brand-muted">
                  Must be an official <code className="font-mono text-brand-primary">@mituniversity.edu.in</code> address.
                </p>
                {error && <p className="mt-1.5 text-xs font-semibold text-brand-overdue">{error}</p>}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEmail("");
                      setError("");
                    }}
                    className="rounded-xl border border-brand-softline px-4 py-2 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-brand-hover"
                  >
                    <SendIcon className="h-3.5 w-3.5" /> Send Invite
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {facultyInviteStatus === "sent" && (
          <div className="mt-4 rounded-xl border border-brand-amber/30 bg-brand-amber/10 p-4">
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-deep">
              <ClockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary" />
              Invite sent to {facultyInviteEmail}. Awaiting their acceptance.
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-brand-muted">Faculty Mentor</p>
                <p className="truncate text-sm font-bold text-brand-deep">{facultyInviteEmail}</p>
              </div>
              {isLead ? (
                <button
                  type="button"
                  onClick={() => setRevokeDialogOpen(true)}
                  className="ml-3 shrink-0 rounded-lg border border-brand-softline bg-white px-3 py-1.5 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-overdue/40 hover:text-brand-overdue"
                >
                  Revoke
                </button>
              ) : (
                <LockIcon className="ml-3 h-4 w-4 shrink-0 text-brand-muted" />
              )}
            </div>
          </div>
        )}

        {facultyInviteStatus === "verified" && (
          <div className="mt-4 rounded-xl border border-brand-approved/25 bg-brand-approved/5 p-4">
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-brand-approved/10 px-3 py-2 text-xs font-semibold text-brand-approved">
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Faculty mentor approved for {facultyInviteEmail || "your team"}.
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-approved text-sm font-bold text-white">
                {mentors.institute.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brand-deep">{mentors.institute.name}</p>
                <p className="truncate text-xs font-medium text-brand-muted">{mentors.institute.dept}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-approved/10 px-2.5 py-1 text-[10px] font-bold uppercase text-brand-approved">
                <CheckIcon className="h-3 w-3" /> Confirmed
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-brand-approved/15 pt-3 text-xs font-semibold text-brand-charcoal/80">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-brand-approved" />
                Next review: <span className="font-bold">{mentors.institute.nextReview}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageIcon className="h-3.5 w-3.5 text-brand-primary" />
                1:1 sync available
              </span>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={revokeDialogOpen}
          title="Revoke Faculty Mentor Invite?"
          message={`Revoke invite to ${facultyInviteEmail ?? ""}? They will no longer be considered for this team.`}
          confirmLabel="Revoke Invite"
          confirmColor="danger"
          onConfirm={handleRevokeConfirm}
          onCancel={() => setRevokeDialogOpen(false)}
        />
      </div>
    </div>
  );
}