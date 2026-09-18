"use client";

import { useState } from "react";
import { useTeam } from "./TeamProvider";
import { MailIcon, CheckIcon, XIcon, ClockIcon, AlertCircleIcon } from "./icons";

export default function IncomingInvitesCard() {
  const { incomingInvites, acceptInvite, declineInvite, role } = useTeam();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (role !== "NO_TEAM" || incomingInvites.length === 0) return null;

  const run = async (inviteId: string, fn: () => Promise<void>) => {
    setActionError(null);
    setBusyId(inviteId);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update this invitation");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
          <MailIcon className="h-4 w-4 text-brand-primary" /> Incoming Team Invitations
        </h3>
        <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
          {incomingInvites.length}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
        A team leader invited you to join their squad. Accept to become a member, or decline to keep looking.
      </p>

      {actionError && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-xs font-semibold text-danger">
          <AlertCircleIcon className="h-3.5 w-3.5" /> {actionError}
        </p>
      )}

      <div className="mt-3 space-y-2.5">
        {incomingInvites.map((inv) => (
          <div
            key={inv.id}
            className="rounded-xl border border-brand-softline bg-brand-cream/40 p-3.5 transition-colors hover:border-brand-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-brand-deep">{inv.team.name}</span>
                  <span className="rounded border border-brand-softline bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-charcoal/80">
                    {inv.team.teamCode}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-brand-muted">
                  {inv.team.leader?.fullName || "Team leader"}
                  {inv.team.leader?.email ? ` · ${inv.team.leader.email}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-brand-muted">
                  <ClockIcon className="h-3 w-3" />
                  Invited {new Date(inv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => run(inv.id, () => acceptInvite(inv.id))}
                className="flex items-center gap-1.5 rounded-lg bg-brand-approved px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                {busyId === inv.id ? "Joining…" : "Accept Invite"}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => run(inv.id, () => declineInvite(inv.id))}
                className="flex items-center gap-1 rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XIcon className="h-3.5 w-3.5" /> Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}