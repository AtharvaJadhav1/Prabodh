"use client";

import { useState } from "react";
import Link from "next/link";
import { useTeam } from "./TeamProvider";
import Avatar from "../Avatar";
import InteractiveTeamAvatar from "./InteractiveTeamAvatar";
import { UserPlusIcon, LockIcon, PencilIcon, XIcon } from "./icons";

export default function TeamWorkspaceCard() {
  const { members, filledCount, openDrawer, invites, isLead, teamCode, teamName, capacity, teamId, createTeam, renameTeam, loading, team, revokeInvite } = useTeam();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(teamName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const percent = Math.round((filledCount / Math.max(capacity, 1)) * 100);
  const confirmedMembers = members.filter((m) => m.status === "Verified");
  const pendingInvites = invites.length;
  const totalOccupied = confirmedMembers.length + invites.length;
  const slotsLeft = capacity - totalOccupied;
  const canRename = isLead && team?.status !== "locked";

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
          <InteractiveTeamAvatar teamName={teamName} teamId={teamId} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-brand-deep">Team Workspace</h2>
            {editingName ? (
              <form
                className="mt-1 flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = draftName.trim();
                  if (!name || savingName) return;
                  setNameError(null);
                  setSavingName(true);
                  try {
                    await renameTeam(name);
                    setEditingName(false);
                    setDraftName(name);
                  } catch (err) {
                    setNameError(err instanceof Error ? err.message : "Unable to rename team.");
                  } finally {
                    setSavingName(false);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    disabled={savingName}
                    className="w-full max-w-56 rounded-lg border border-brand-softline px-2.5 py-1 text-xs font-medium text-brand-deep outline-none focus:border-brand-primary disabled:opacity-60"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={savingName}
                    className="rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {savingName ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setDraftName(teamName);
                      setNameError(null);
                    }}
                    disabled={savingName}
                    className="rounded-lg border border-brand-softline px-2 py-1 text-xs font-semibold text-brand-muted hover:text-brand-deep disabled:opacity-60"
                    aria-label="Cancel rename"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {nameError ? <p className="text-xs font-medium text-red-700">{nameError}</p> : null}
              </form>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand-muted">
                <span>
                  Team ID: <span className="font-bold text-brand-charcoal">{teamCode}</span>
                </span>
                {canRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(teamName);
                      setNameError(null);
                      setEditingName(true);
                    }}
                    className="rounded-md p-1 text-brand-muted transition-colors hover:bg-brand-softline hover:text-brand-primary"
                    aria-label="Rename team"
                    title="Rename team"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
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
        </div>
        <div className="space-y-2">
          {confirmedMembers.map((member) => (
            <div
              key={member.prn || member.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#EBE3D7] bg-[#FAF8F5] p-3.5 transition-colors hover:border-[#D96B27]/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <Avatar
                  src={member.avatarUrl || null}
                  seed={member.name || member.prn || "member"}
                  className="h-10 w-10 border border-brand-softline"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#5B2E10]">{member.name}</p>
                    {member.role === "Leader" && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                        Team Lead
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#786C65]">
                    {member.prn}
                    {member.branch ? ` • ${member.branch}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#E59850] bg-[#FDF7F2] p-3.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-400 bg-amber-50 text-sm font-bold text-amber-700">
                  ?
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#5B2E10]">Invite Outgoing</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Awaiting Accept
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-[#786C65]">{invite.email}</p>
                </div>
              </div>
              {isLead && (
                <button
                  type="button"
                  onClick={() => void revokeInvite(invite.id)}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          {slotsLeft > 0 &&
            (isLead ? (
              <button
                type="button"
                onClick={openDrawer}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-brand-softline bg-[#FAF7F2]/40 p-4 text-sm font-semibold text-brand-muted transition-all duration-200 hover:border-[#C25E26] hover:bg-white hover:text-[#C25E26]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-softline bg-white text-current shadow-sm transition-colors group-hover:border-[#C25E26]">
                  +
                </div>
                <span>Add Teammate</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-4 text-xs font-semibold text-brand-muted">
                <LockIcon className="h-4 w-4" />
                Read Only — Group managed by Team Lead
              </div>
            ))}
        </div>
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
