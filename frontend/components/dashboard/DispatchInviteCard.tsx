"use client";

import { useRef, useState } from "react";
import { useTeam } from "./TeamProvider";
import { MailIcon, SendIcon, CheckIcon, LockIcon, UsersRoundIcon } from "./icons";

export default function DispatchInviteCard() {
  const { isLead, sendInvite, filledCount, invites, capacity } = useTeam();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seatsLeft = capacity - filledCount;

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid institute email, e.g. name@mituniversity.edu.in");
      return;
    }
    if (seatsLeft <= 0 || filledCount + invites.length >= capacity) {
      setError("Team is full — revoke a pending invite before sending new ones.");
      return;
    }
    setSending(true);
    setSuccess(`Invite queued for ${trimmed}…`);
    try {
      const result = await sendInvite(trimmed);
      if (result.ok) {
        setEmail("");
        if (result.emailSent) {
          setError("");
          setSuccess(`Invite email sent to ${trimmed}.`);
        } else {
          setSuccess("");
          setError(
            result.emailError
              ? `Invite saved, but email failed: ${result.emailError}`
              : "Invite saved, but the email was not sent. Check Resend settings on the backend.",
          );
        }
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setSuccess(""), 3500);
      } else {
        setError("Could not send this invite.");
      }
    } catch (err) {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
          <MailIcon className="h-4 w-4 text-brand-primary" /> Dispatch Team Invitation
        </h3>
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[10px] font-bold text-brand-primary">
          {seatsLeft} slot{seatsLeft !== 1 ? "s" : ""} left
        </span>
      </div>

      {isLead ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="member.email@mituniversity.edu.in"
              className="h-10 w-full px-3 py-2 text-xs rounded-xl border border-brand-softline bg-brand-cream font-medium text-brand-charcoal transition-all placeholder:text-brand-charcoal/45 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 outline-none sm:h-11"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 sm:h-11"
            >
              <SendIcon className="h-4 w-4" /> {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs font-semibold text-brand-charcoal/80">{error}</p>}
          {success && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-approved">
              <CheckIcon className="h-3.5 w-3.5" /> {success}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 p-3 bg-white rounded-lg border border-[#EBE3D7]">
            <span className="w-8 h-8 shrink-0 rounded-md bg-[#FBECE0] text-[#D96B27] font-bold flex items-center justify-center">
              {invites.length}
            </span>
            <p className="text-xs leading-relaxed text-brand-muted">
              <span className="block">
                <span className="font-bold text-brand-deep">
                  {invites.length} pending invite{invites.length !== 1 ? "s" : ""}
                </span>{" "}
                awaiting acceptance.
              </span>
              <span className="block">
                An email is sent with a link to register. They must sign up using the same invited email.
              </span>
            </p>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <p className="flex items-start gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-xs leading-relaxed text-brand-muted">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
            Only the Team Lead can dispatch invitations to team members.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-xs font-semibold text-brand-muted">
            <UsersRoundIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            {filledCount}/{capacity} members finalized • {invites.length} pending invite
            {invites.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}