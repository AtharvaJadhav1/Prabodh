"use client";

import { useState } from "react";
import Link from "next/link";
import { type Member } from "../../data/studentDashboard";
import { useTeam } from "./TeamProvider";
import { UsersIcon, CheckIcon, UserPlusIcon, LockIcon } from "./icons";

function MemberRow({
  member,
  index,
  isLead,
  onInviteNow,
}: {
  member: Member;
  index: number;
  isLead: boolean;
  onInviteNow: () => void;
}) {
  if (member.status === "Empty") {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#E2D8CC] bg-brand-canvas/60 p-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-[#EBE3D7] text-sm font-bold text-[#786C65]">
            {member.initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-brand-deep">Open Slot — Awaiting Member</p>
              <span className="rounded-md bg-brand-softline px-2 py-0.5 text-[10px] font-bold text-brand-charcoal/60">
                Unfilled
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-brand-muted">
              Required to complete team formation and lock the official roster.
            </p>
          </div>
        </div>
        {isLead ? (
          <button
            type="button"
            onClick={onInviteNow}
            className="shrink-0 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
          >
            Invite
          </button>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-muted">
            <LockIcon className="h-3 w-3" /> Lead Only
          </span>
        )}
      </li>
    );
  }

  const isPending = member.status === "Invite Pending";

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
        isPending
          ? "border-dashed border-[#E59850] bg-[#FDF7F2]"
          : "border-[#EBE3D7] bg-[#FAF8F5] hover:border-[#D96B27]/40"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            member.role === "Leader"
              ? "bg-brand-primary text-white"
              : isPending
                ? "border border-dashed border-[#E59850] bg-[#FAF8F5] text-[#E59850]"
                : index % 2 === 0
                  ? "bg-brand-deep text-white"
                  : "bg-brand-primary text-white"
          }`}
        >
          {member.initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-[#5B2E10]">
              {isPending ? "Invite Pending" : member.name}
            </p>
            {!isPending && member.status === "Verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[11px] leading-none font-bold text-brand-approved">
                <CheckIcon className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#786C65]">
            {isPending ? member.prn : `${member.prn} • ${member.branch}`}
          </p>
        </div>
      </div>
      <span
        className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
          member.role === "Leader"
            ? "bg-brand-primary/10 text-brand-primary"
            : isPending
              ? "bg-[#FBECE0] text-[#D96B27]"
              : "bg-brand-softline text-brand-charcoal/70"
        }`}
      >
        {member.role === "Leader" ? "Team Lead" : isPending ? "Awaiting Acceptance" : "Member"}
      </span>
    </li>
  );
}

export default function TeamWorkspaceCard() {
  const { members, filledCount, openDrawer, invites, isLead, teamCode, teamName, capacity, teamId, createTeam, loading } = useTeam();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const percent = Math.round((filledCount / Math.max(capacity, 1)) * 100);
  const pendingInvites = invites.length;
  const availableSlots = capacity - filledCount;

  if (loading) {
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

  if (!teamId) {
    return (
      <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
        <h2 className="text-base font-bold text-brand-deep">Create your team</h2>
        <p className="mt-1 text-sm text-brand-muted">
          You are not on a team yet. Create one to invite members and lock a problem statement.
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
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-deep text-white shadow-sm">
            <UsersIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-brand-deep">Team Workspace</h2>
            <p className="truncate text-xs font-medium text-brand-muted">
              Team ID: <span className="font-bold text-brand-charcoal">{teamCode}</span> • {teamName}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 self-start rounded-full border px-3 py-1 text-xs font-bold sm:self-center ${
            filledCount === capacity
              ? "border-brand-approved/20 bg-brand-approved/10 text-brand-approved"
              : "border-brand-warmBorder bg-brand-lightOrange text-brand-primary"
          }`}
        >
          {filledCount} of {capacity} Members Finalized
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-brand-deep">Team Strength Progress</span>
          <span className="text-xs font-bold text-brand-primary">{percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F6D5BD]">
          <div
            className="h-full rounded-full bg-[#D96B27] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mb-3 mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#786C65]">Team Roster</h3>
          <span className="text-xs font-semibold text-[#D96B27]">
            {availableSlots > 0 ? `${availableSlots} slot${availableSlots > 1 ? "s" : ""} left` : "Full"}
          </span>
        </div>
        <ul className="space-y-2">
          {members.map((member, i) => (
            <MemberRow key={i} member={member} index={i} isLead={isLead} onInviteNow={openDrawer} />
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-softline pt-4">
        <p className="text-xs font-medium text-brand-muted">
          {pendingInvites > 0 ? (
            <>
              <span className="font-bold text-brand-charcoal">{pendingInvites}</span> pending{" "}
              {pendingInvites === 1 ? "invite" : "invites"} awaiting acceptance
            </>
          ) : (
            "No pending invitations — send invites to fill remaining slots."
          )}
        </p>
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