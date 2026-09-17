"use client";

import { useState } from "react";
import type { MentorInvite } from "../../data/industryDashboard";

type Props = {
  invite: MentorInvite;
  onAccept: (id: string) => void | Promise<void>;
  onDecline: (id: string) => void | Promise<void>;
};

export default function InviteCard({ invite, onAccept, onDecline }: Props) {
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs transition duration-200 hover:shadow-md hover:border-brand-primary/40">
      <div className="flex items-start justify-between pb-4 border-b border-brand-sand">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold tracking-wider text-white shadow-xs">
            {invite.instituteMentorInitials}
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-deep">{invite.instituteMentorName}</h3>
            <p className="text-xs text-brand-muted">{invite.instituteMentorTitle}</p>
          </div>
        </div>
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary">
          {invite.invitedAt}
        </span>
      </div>

      <div className="py-4">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Invitation covers {invite.groupIds.length} Team{invite.groupIds.length !== 1 ? "s" : ""}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {invite.groupIds.map((id) => (
            <span
              key={id}
              className="rounded-md border border-brand-sand bg-brand-cream px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-charcoal"
            >
              {id}
            </span>
          ))}
        </div>
      </div>

      {confirmDecline ? (
        <div className="flex items-center justify-between rounded-xl border border-brand-overdue/40 bg-red-50 p-3">
          <p className="text-xs font-semibold text-brand-overdue">Decline this invite?</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDecline(false)}
              className="rounded-lg border border-brand-sand px-3 py-1 text-[11px] font-bold text-brand-muted hover:bg-white disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => onDecline(invite.id))}
              className="rounded-lg bg-brand-overdue px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Working…" : "Confirm Decline"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => onAccept(invite.id))}
            className="flex-1 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-60"
          >
            {busy ? "Working…" : "Accept Invite"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDecline(true)}
            className="flex-1 rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-xs font-bold text-brand-deep transition-colors hover:bg-brand-cream disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
