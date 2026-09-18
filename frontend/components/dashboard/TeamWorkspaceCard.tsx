"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTeam } from "./TeamProvider";
import Avatar from "../Avatar";
import { getUserAvatarUrl } from "../../lib/avatar";
import InteractiveTeamAvatar from "./InteractiveTeamAvatar";
import {
  UserPlusIcon,
  LockIcon,
  PlusIcon,
  MailIcon,
  SendIcon,
  ClockIcon,
  CheckIcon,
} from "./icons";

export default function TeamWorkspaceCard() {
  const {
    members,
    filledCount,
    openDrawer,
    invites,
    isLead,
    teamCode,
    teamName,
    capacity,
    teamId,
    createTeam,
    loading,
    revokeInvite,
    sendInvite,
    role,
  } = useTeam();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamNameInputRef = useRef<HTMLInputElement | null>(null);
  const percent = Math.round((filledCount / Math.max(capacity, 1)) * 100);
  const confirmedMembers = members.filter((m) => m.status === "Verified");
  const totalOccupied = confirmedMembers.length + invites.length;
  const slotsLeft = capacity - totalOccupied;

  const closeInviteForm = () => {
    setIsInviting(false);
    setInviteEmail("");
    setInviteError("");
    if (flashTimer.current) clearTimeout(flashTimer.current);
  };

  const handleSendInvite = async () => {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInviteError("Enter a valid institute email, e.g. name@mituniversity.edu.in");
      return;
    }
    if (slotsLeft <= 0 || filledCount + invites.length >= capacity) {
      setInviteError("Team is full — revoke a pending invite before sending new ones.");
      return;
    }
    setInviteSending(true);
    setInviteSuccess(`Invite queued for ${trimmed}…`);
    try {
      const result = await sendInvite(trimmed);
      if (result.ok) {
        setInviteEmail("");
        setInviteError("");
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setInviteSuccess(""), 3500);
        setIsInviting(false);
      } else {
        setInviteError("Could not send this invite.");
      }
    } catch (err) {
      setInviteSuccess("");
      setInviteError(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setInviteSending(false);
    }
  };

  if (loading && !teamId) {
    return (
      <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
        <h2 className="text-base font-bold text-brand-deep">Team workspace</h2>
        <div className="mt-3 flex items-center gap-2 text-sm text-brand-muted">
          <span className="h-4 w-4 animate-pulse rounded-full border-2 border-brand-primary border-t-transparent" />
          Loading your team…
        </div>
      </section>
    );
  }

  if (!teamId || role === "NO_TEAM") {
    return (
      <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
        <h2 className="text-base font-bold text-brand-deep">Create your team</h2>
        <p className="mt-1 text-sm text-brand-muted">
          You're not on a team yet — create one or wait for an invite.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = String(new FormData(form).get("team-name") ?? "").trim();
            if (!name || creating) return;
            setCreateError(null);
            setCreating(true);
            try {
              await createTeam(name);
            } catch (err) {
              setCreateError(
                err instanceof Error ? err.message : "Unable to create team. Please try again.",
              );
            } finally {
              setCreating(false);
            }
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={teamNameInputRef}
              name="team-name"
              required
              disabled={creating}
              placeholder="Team name"
              className="w-full rounded-xl border border-brand-softline px-3 py-2.5 text-sm text-brand-deep outline-none focus:border-brand-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={creating}
              className="shrink-0 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create team"}
            </button>
          </div>
          {createError ? <p className="text-sm font-medium text-red-700">{createError}</p> : null}
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-brand-softline pt-4">
          <button
            type="button"
            onClick={() => {
              teamNameInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
              teamNameInputRef.current?.focus();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-cream px-4 py-2.5 text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary/15"
          >
            Create a Team
          </button>
          <Link
            href="/dashboard/student/group-requests"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-softline px-4 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Invited to a team?
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <InteractiveTeamAvatar teamName={teamName} teamId={teamId} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-brand-deep">Team Workspace</h2>
            <p className="flex items-center gap-1.5 text-xs font-medium text-brand-muted">
              <span>Team ID: {teamCode}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-brand-deep">Team Strength Progress</span>
          <span className="text-xs font-bold text-brand-primary">{percent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#F6D5BD]">
          <div
            className="h-full rounded-full bg-[#D96B27] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#786C65]">Team Roster</h3>
            <span className="rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-bold text-brand-primary">
              {confirmedMembers.length}/{capacity} filled
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {confirmedMembers.map((member) => (
            <div
              key={member.prn || member.name}
              className="group flex items-center justify-between gap-3 rounded-xl border border-[#EBE3D7] bg-white p-3.5 shadow-[0_1px_2px_rgba(91,46,16,0.04)] transition-all hover:border-[#D96B27]/50 hover:shadow-md"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="shrink-0 rounded-full ring-2 ring-brand-primary/20">
                  <Avatar
                    src={getUserAvatarUrl(member)}
                    seed={member.name || member.prn || "member"}
                    className="h-10 w-10 border-2 border-white"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#5B2E10]">{member.name}</p>
                    {member.role === "Leader" ? (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                        Team Lead
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand-approved/10 px-2 py-0.5 text-[11px] font-bold text-brand-approved">
                        Member
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {member.role === "Leader" && (
                <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-semibold text-brand-muted sm:flex">
                  <CheckIcon className="h-3.5 w-3.5 text-brand-primary" /> Manages team
                </span>
              )}
            </div>
          ))}

          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#E59850] bg-[#FDF7F2] p-3.5 transition-colors hover:border-amber-500/60"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-400 bg-amber-50 text-amber-600">
                  <MailIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-sm font-bold text-[#5B2E10]">{invite.email}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <ClockIcon className="h-3 w-3" /> Awaiting Accept
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#786C65]">Invitation sent — joins the team on accept</p>
                </div>
              </div>
              {isLead && (
                <button
                  type="button"
                  disabled={revokingInviteId === invite.id}
                  onClick={() => {
                    setRevokingInviteId(invite.id);
                    void revokeInvite(invite.id)
                      .catch(() => undefined)
                      .finally(() => setRevokingInviteId((id) => (id === invite.id ? null : id)));
                  }}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {revokingInviteId === invite.id ? "Revoking…" : "Revoke"}
                </button>
              )}
            </div>
          ))}

          {slotsLeft > 0 &&
            (isLead ? (
              isInviting ? (
                <div className="rounded-2xl border border-brand-primary/25 bg-brand-cream/60 p-4 shadow-[0_2px_8px_rgba(91,46,16,0.06)]">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C25E26]">
                      <MailIcon className="h-3.5 w-3.5" />
                      <span>Invite Team Member</span>
                    </div>
                    <button
                      type="button"
                      onClick={closeInviteForm}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-muted transition-colors hover:bg-white hover:text-brand-deep"
                    >
                      Cancel
                    </button>
                  </div>

                  <form
                    className="space-y-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendInvite();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        autoFocus
                        required
                        placeholder="teammate@mituniversity.edu.in"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError("");
                        }}
                        className="h-10 flex-1 rounded-xl border border-brand-softline bg-white px-3.5 py-2 text-xs font-medium text-brand-charcoal outline-none transition-all placeholder:text-brand-charcoal/45 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                      />
                      <button
                        type="submit"
                        disabled={inviteSending || !inviteEmail.trim()}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <SendIcon className="h-3.5 w-3.5" /> {inviteSending ? "Sending…" : "Send"}
                      </button>
                    </div>
                    {inviteError ? (
                      <p className="text-[11px] font-semibold text-red-600">{inviteError}</p>
                    ) : null}
                    {inviteSuccess ? (
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-approved">
                        <CheckIcon className="h-3.5 w-3.5" /> {inviteSuccess}
                      </p>
                    ) : null}
                    <p className="text-[11px] leading-relaxed text-brand-muted">
                      We'll email them an invite link. Teammates must join using their invited institutional email
                      address.
                    </p>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsInviting(true)}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-brand-softline bg-[#FAF7F2]/40 p-4 text-sm font-semibold text-brand-muted transition-all duration-200 hover:border-[#C25E26] hover:bg-white hover:text-[#C25E26]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-softline bg-white text-current shadow-sm transition-colors group-hover:border-[#C25E26]">
                    <PlusIcon className="h-4 w-4" />
                  </div>
                  <span>Add Teammate</span>
                </button>
              )
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-4 text-xs font-semibold text-brand-muted">
                <LockIcon className="h-4 w-4" />
                Read Only — Group managed by Team Lead
              </div>
            ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-softline pt-4">
        {isLead ? (
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99]"
          >
            <UserPlusIcon className="h-4 w-4" />
            Manage Group Requests
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-xs font-semibold text-brand-muted">
            <LockIcon className="h-4 w-4" />
            Read Only — Group managed by Team Lead
          </span>
        )}
        <Link
          href="/dashboard/student/group-requests"
          className="inline-flex items-center gap-2 rounded-xl border border-brand-softline px-4 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          Open Full Team Page
        </Link>
      </div>
    </section>
  );
}
