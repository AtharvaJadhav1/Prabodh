"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PortalNotification } from "../../lib/types";
import { performNotificationAction, type ActionDecision } from "./notification-store";

type Note = { tone: "ok" | "info" | "error"; text: string };

const CHIP: Record<string, { label: string; cls: string }> = {
  accepted: { label: "Accepted ✓", cls: "bg-brand-approved/10 text-brand-approved" },
  declined: { label: "Declined", cls: "bg-brand-sand/70 text-brand-muted" },
  expired: { label: "Expired", cls: "bg-brand-sand/70 text-brand-muted" },
};

/**
 * Inline Accept / Decline for actionable notifications, shared by the panel rows and the toasts.
 * Handles busy state, "already handled", the team-switch confirmation and retryable errors.
 */
export default function NotificationActions({
  n,
  onSettled,
}: {
  n: PortalNotification;
  /** Fired after a successful (or already handled) answer, so a toast can auto-dismiss. */
  onSettled?: () => void;
}) {
  const [busy, setBusy] = useState<ActionDecision | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [needsHandover, setNeedsHandover] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [lastDecision, setLastDecision] = useState<ActionDecision>("accept");
  const mounted = useRef(true);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (decision: ActionDecision, confirmSwitch = false) => {
      setBusy(decision);
      setLastDecision(decision);
      setNote(null);
      const out = await performNotificationAction(n.id, decision, confirmSwitch);
      if (!mounted.current) return;
      setBusy(null);
      if (out.status === "confirm") {
        setNeedsHandover(out.requiresSuccessor === true);
        setConfirming(true);
        return;
      }
      setConfirming(false);
      setNeedsHandover(false);
      if (out.status === "error") {
        setNote({ tone: "error", text: out.message });
        return;
      }
      setNote(out.status === "handled" ? { tone: "info", text: out.message } : null);
      settledRef.current?.();
    },
    [n.id],
  );

  if (!n.actionKind) return null;

  const state = n.actionState ?? null;
  const btn =
    "inline-flex items-center justify-center rounded-lg px-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 disabled:cursor-not-allowed disabled:opacity-60 min-h-8 max-sm:min-h-11";

  if (state && state !== "pending") {
    const chip = CHIP[state] ?? CHIP.expired;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip.cls}`}>
          {chip.label}
        </span>
        {note ? <span className="min-w-0 break-words text-[11px] text-brand-muted">{note.text}</span> : null}
      </div>
    );
  }

  if (!state) {
    // Actionable kind without a known state: nothing safe to offer.
    return null;
  }

  if (confirming && needsHandover) {
    // A lead with other members must hand over leadership first, which cannot be done from here.
    return (
      <div className="mt-2 rounded-lg border border-brand-warmBorder bg-brand-lightOrange/60 p-2.5" role="alert">
        <p className="break-words text-xs text-brand-deep">
          You lead a team that has other members. Hand over leadership first, then accept this invite.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href="/dashboard/student/group-requests" className={`${btn} bg-[#C25E26] text-white hover:bg-[#a94f1f]`}>
            Open Group Requests
          </a>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setNeedsHandover(false);
            }}
            className={`${btn} border border-brand-softline bg-white text-brand-deep hover:bg-[#FAF7F2]`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="mt-2 rounded-lg border border-brand-warmBorder bg-brand-lightOrange/60 p-2.5" role="alert">
        <p className="break-words text-xs text-brand-deep">
          Accepting will move you out of your current team. Continue?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("accept", true)}
            className={`${btn} bg-[#C25E26] text-white hover:bg-[#a94f1f]`}
          >
            {busy ? "Working…" : "Yes, switch team"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setConfirming(false)}
            className={`${btn} border border-brand-softline bg-white text-brand-deep hover:bg-[#FAF7F2]`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("accept")}
          aria-label={`Accept: ${n.title}`}
          className={`${btn} bg-[#C25E26] text-white hover:bg-[#a94f1f]`}
        >
          {busy === "accept" ? "Accepting…" : note?.tone === "error" && lastDecision === "accept" ? "Retry" : "Accept"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("decline")}
          aria-label={`Decline: ${n.title}`}
          className={`${btn} border border-brand-softline bg-white text-brand-deep hover:bg-[#FAF7F2]`}
        >
          {busy === "decline" ? "Declining…" : note?.tone === "error" && lastDecision === "decline" ? "Retry" : "Decline"}
        </button>
      </div>
      {note ? (
        <p
          role={note.tone === "error" ? "alert" : "status"}
          className={`mt-1.5 break-words text-[11px] ${note.tone === "error" ? "text-brand-overdue" : "text-brand-muted"}`}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
