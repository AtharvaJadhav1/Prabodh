"use client";

import { useEffect, useRef, useState } from "react";
import { team } from "../../data/studentDashboard";
import { useTeam } from "./TeamProvider";
import {
  XIcon,
  MailIcon,
  SendIcon,
  CheckIcon,
  ClockIcon,
  UserPlusIcon,
  UserCheckIcon,
  LockIcon,
  SparklesIcon,
} from "./icons";

export default function GroupDrawer() {
  const {
    drawerOpen,
    closeDrawer,
    invites,
    requests,
    requestResults,
    filledCount,
    sendInvite,
    revokeInvite,
    approveRequest,
    rejectRequest,
    isLead,
  } = useTeam();

  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [resultFlash, setResultFlash] = useState<{ text: string; tone: "approved" | "rejected" } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!drawerOpen) {
      setInviteSuccess("");
      setResultFlash(null);
    }
  }, [drawerOpen]);

  const handleSend = () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInviteError("Enter a valid institute email, e.g. name@mituniversity.edu.in");
      return;
    }
    if (filledCount + invites.length >= team.capacity) {
      setInviteError("Team is full — revoke a pending invite before sending new ones.");
      return;
    }
    const ok = sendInvite(trimmed);
    if (ok) {
      setEmail("");
      setInviteError("");
      setInviteSuccess(`Invite sent to ${trimmed}.`);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setInviteSuccess(""), 3500);
    } else {
      setInviteError("This student is already invited.");
    }
  };

  const handleApprove = (index: number) => {
    if (resultFlashTimer.current) clearTimeout(resultFlashTimer.current);
    approveRequest(index);
    setResultFlash({ text: "Request approved — candidate added to roster.", tone: "approved" });
    resultFlashTimer.current = setTimeout(() => setResultFlash(null), 3000);
  };

  const handleReject = (index: number) => {
    if (resultFlashTimer.current) clearTimeout(resultFlashTimer.current);
    rejectRequest(index);
    setResultFlash({ text: "Request rejected — candidate notified.", tone: "rejected" });
    resultFlashTimer.current = setTimeout(() => setResultFlash(null), 3000);
  };

  const seatsLeft = team.capacity - filledCount;

  return (
    <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
      <div
        className={`absolute inset-0 bg-brand-deep/50 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeDrawer}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Group Requests"
      >
        <div className="flex items-center justify-between border-b border-brand-softline px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
              <MailIcon className="h-5 w-5 text-brand-primary" />
              Group Requests
            </h2>
            <p className="mt-0.5 text-xs font-medium text-brand-muted">
              {seatsLeft > 0 ? `${seatsLeft} slot${seatsLeft > 1 ? "s" : ""} left in Team ${team.name}` : "Team roster is full."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
            aria-label="Close group requests"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {resultFlash && (
            <div
              className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-semibold leading-relaxed ${
                resultFlash.tone === "approved"
                  ? "border-brand-approved/25 bg-brand-approved/10 text-brand-approved"
                  : "border-brand-charcoal/20 bg-brand-cream text-brand-deep"
              }`}
            >
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {resultFlash.text}
            </div>
          )}

          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
              {isLead ? "Invite by Email" : "Invite by Email (Read Only)"}
            </h3>
            {isLead ? (
              <>
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setInviteError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="member.email@mituniversity.edu.in"
                    className="w-full rounded-xl border border-brand-softline bg-white py-2.5 pl-3.5 pr-3 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/45 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99]"
                  >
                    <SendIcon className="h-4 w-4" /> Send
                  </button>
                </div>
                {inviteError && <p className="mt-1.5 text-xs font-semibold text-brand-charcoal/80">{inviteError}</p>}
                {inviteSuccess && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-approved">
                    <CheckIcon className="h-3.5 w-3.5" /> {inviteSuccess}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 flex items-start gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-xs leading-relaxed text-brand-muted">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                Only the Team Lead can dispatch new invites. You can view pending invitations below.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
              <ClockIcon className="h-3.5 w-3.5" /> Outgoing Invites ({invites.length})
            </h3>
            <div className="mt-2 space-y-2">
              {invites.length === 0 && (
                <p className="rounded-xl border border-dashed border-brand-softline bg-brand-cream p-3 text-center text-xs font-medium text-brand-muted">
                  No pending invites.
                </p>
              )}
              {invites.map((invite) => (
                <div
                  key={invite.email}
                  className="flex items-center gap-3 rounded-xl border border-brand-softline bg-white p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-amber/15 text-xs font-bold text-brand-primary">
                    {invite.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-brand-deep">{invite.email}</p>
                    <p className="text-xs font-medium text-brand-muted">
                      Invited {invite.sentAt} • awaiting acceptance
                    </p>
                  </div>
                  {isLead ? (
                    <button
                      type="button"
                      onClick={() => revokeInvite(invite.email)}
                      className="shrink-0 rounded-lg border border-brand-softline px-3 py-1.5 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                    >
                      Revoke
                    </button>
                  ) : (
                    <LockIcon className="h-4 w-4 shrink-0 text-brand-muted" />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-muted">
              <UserPlusIcon className="h-3.5 w-3.5" /> Incoming Requests ({requests.length})
            </h3>
            <div className="mt-2 space-y-2">
              {requests.length === 0 && (
                <p className="rounded-xl border border-dashed border-brand-softline bg-brand-cream p-3 text-center text-xs font-medium text-brand-muted">
                  No incoming requests right now.
                </p>
              )}
              {requests.map((req, i) => {
                const result = requestResults[i];
                return (
                  <div key={i} className="rounded-xl border border-brand-softline bg-white p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                        {req.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-brand-deep">{req.name}</p>
                          <span className="rounded-full bg-brand-softline px-2 py-0.5 text-[10px] font-bold text-brand-charcoal/70">
                            CGPA {req.cgpa}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-brand-muted">
                          {req.prn} • {req.branch}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-brand-charcoal/75">{req.note}</p>
                      </div>
                    </div>
                    {result ? (
                      <p
                        className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                          result === "approved"
                            ? "bg-brand-approved/10 text-brand-approved"
                            : "bg-brand-cream text-brand-muted"
                        }`}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        {result === "approved" ? "Approved & added to team roster" : "Request rejected"}
                      </p>
                    ) : isLead ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(i)}
                          disabled={seatsLeft <= 0}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-approved px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-approved/90 disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted sm:flex-none"
                        >
                          <UserCheckIcon className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(i)}
                          className="inline-flex flex-1 items-center justify-center rounded-lg border border-brand-softline px-3 py-2 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary sm:flex-none"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand-cream px-3 py-2 text-xs font-semibold text-brand-muted">
                        <LockIcon className="h-3.5 w-3.5" /> View Only — Team Lead approves requests
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="border-t border-brand-softline px-5 py-4">
          <p className="flex items-start gap-2 rounded-xl bg-brand-cream p-3 text-xs leading-relaxed text-brand-charcoal/75">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
            Roster locks automatically at <span className="font-bold">6/6 members</span>. Only the
            Team Lead can manage requests.
          </p>
          <button
            type="button"
            onClick={closeDrawer}
            className="mt-3 w-full inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            <SparklesIcon className="mr-2 h-4 w-4" /> Done
          </button>
        </div>
      </aside>
    </div>
  );
}