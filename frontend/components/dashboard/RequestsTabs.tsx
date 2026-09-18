"use client";

import { useState } from "react";
import { useTeam } from "./TeamProvider";
import {
  UsersRoundIcon,
  InboxIcon,
  CheckIcon,
  MailIcon,
  ClockIcon,
  XIcon,
  BadgeCheckIcon,
  AlertCircleIcon,
  GradCapIcon,
  UserPlusIcon,
  LockIcon,
} from "./icons";
import Avatar from "../Avatar";
import { getUserAvatarUrl } from "../../lib/avatar";

export default function RequestsTabs() {
  const [tab, setTab] = useState<1 | 2>(1);
  const { filledCount, invites, incomingInvites } = useTeam();

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-softline bg-white shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="bg-brand-cream/70 px-6 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 border-b border-[#EBE3D7]">
            <TabButton
              active={tab === 1}
              onClick={() => setTab(1)}
              icon={<UsersRoundIcon className="h-4 w-4" />}
              label="Active Team &amp; Outgoing Invites"
              chip={`${filledCount} verified • ${invites.length} pending`}
              chipStyle="bg-brand-primary/10 text-brand-primary"
            />
            <TabButton
              active={tab === 2}
              onClick={() => setTab(2)}
              icon={<InboxIcon className="h-4 w-4" />}
              label="Incoming Join Requests"
              chip={`${incomingInvites.length} open`}
              chipStyle="bg-[#C25E26] text-white"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {tab === 1 ? <ActiveRosterTab /> : <IncomingInvitesTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  chip,
  chipStyle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  chip: string;
  chipStyle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition-all ${
        active
          ? "border-brand-primary text-brand-primary"
          : "border-transparent font-semibold text-brand-muted hover:text-brand-deep"
      }`}
    >
      {icon}
      <span className="hidden truncate sm:inline">{label}</span>
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${chipStyle}`}>{chip}</span>
    </button>
  );
}

function ActiveRosterTab() {
  const { members, invites, facultyInviteStatus, facultyInviteEmail, revokeInvite, removeMember, isLead, team } = useTeam();
  const assignments = team?.mentorAssignments ?? [];
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleRevoke = async (inviteId: string) => {
    setRevokeError(null);
    setRevokingId(inviteId);
    try {
      await revokeInvite(inviteId);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Could not revoke invitation");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-brand-deep">
              Confirmed Roster Members
            </h3>
            <p className="text-xs text-brand-muted">Verified members on this team.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {members.map((m, i) =>
            m.status === "Verified" ? (
              <MemberRow
                key={`${m.name}-${i}`}
                index={i}
                member={m}
                isLead={isLead}
                onRemove={() => removeMember(i)}
              />
            ) : null,
          )}
        </div>
      </section>

      <section className="border-t border-brand-softline pt-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-brand-deep">
              Faculty Mentor &amp; Guide Track
              <span className="text-xs font-normal text-brand-muted">(First-to-Accept Locks In)</span>
            </h3>
            <p className="text-xs text-brand-muted">
              Institute faculty mentors invited by the team leader.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#EBE3D7] bg-[#FAF8F5]">
          {assignments.length === 0 && facultyInviteStatus === "none" ? (
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-charcoal/30 text-xs font-bold text-brand-muted">
                <GradCapIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-deep">No mentors assigned</p>
                <p className="mt-0.5 text-[11px] text-brand-muted">
                  An administrator or team leader can invite an institute mentor.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-approved text-xs font-bold text-white shadow-sm">
                    {a.mentor.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-deep">{a.mentor.fullName}</p>
                    <p className="text-[11px] text-brand-muted">
                      Institute Mentor · {a.mentor.email}
                    </p>
                  </div>
                </div>
              ))}
              {facultyInviteStatus === "sent" ? (
                <p className="text-[11px] text-brand-muted">Pending invite: {facultyInviteEmail}</p>
              ) : null}
            </div>
          )}
<div className="flex shrink-0 items-center gap-2">
            {facultyInviteStatus === "none" ? (
              isLead ? (
                <a
                  href="/dashboard/student/mentors"
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
                >
                  <UserPlusIcon className="h-3 w-3" /> Invite Mentor
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-brand-softline bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-muted">
                  <LockIcon className="h-3 w-3" /> Managed by Team Lead
                </span>
              )
            ) : facultyInviteStatus === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[11px] font-semibold text-brand-approved">
                <CheckIcon className="h-3 w-3" /> Verified Faculty Guide
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                <ClockIcon className="h-3 w-3 text-brand-primary" /> Invite Sent — Awaiting Acceptance
              </span>
            )}
            <BadgeCheckIcon className="h-4 w-4 shrink-0 text-brand-approved" />
          </div>
        </div>
      </section>

      <section className="border-t border-brand-softline pt-4">
        <div className="mb-3.5">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-brand-deep">
            Outgoing Pending Invitations
            <span className="text-xs font-normal text-brand-muted">({invites.length} Active Dispatch)</span>
          </h3>
          <p className="text-xs text-brand-muted">
            Invites sent by Team Leader awaiting recipient student verification.
          </p>
        </div>

        {invites.length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-softline bg-brand-cream p-3 text-center text-xs font-medium text-brand-muted">
            No pending outgoing invitations.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-softline">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-brand-softline bg-brand-cream">
                  <th className="w-2/5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Recipient Email</th>
                  <th className="w-1/5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Sent Timestamp</th>
                  <th className="w-1/4 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Delivery &amp; Status</th>
                  <th className="w-auto px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-brand-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-brand-softline/60 transition-colors last:border-b-0 hover:bg-[#FAF7F2]/60">
                    <td className="w-2/5 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-warmBorder bg-brand-lightOrange text-brand-primary">
                          <MailIcon className="h-4 w-4" />
                        </div>
                        <span className="truncate font-mono text-xs font-semibold text-brand-deep">{inv.email}</span>
                      </div>
                    </td>
                    <td className="w-1/5 px-4 py-3.5">
                      <span className="text-xs font-medium text-brand-muted">{inv.sentAt || "Just now"}</span>
                    </td>
                    <td className="w-1/4 px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-amber/30 bg-brand-amber/20 px-3 py-1 text-xs font-medium text-brand-deep">
                        <ClockIcon className="h-3.5 w-3.5 animate-pulse text-brand-primary" /> Pending Acceptance
                      </span>
                    </td>
                    <td className="w-auto px-4 py-3.5 text-right">
                      {isLead ? (
                        <button
                          type="button"
                          disabled={revokingId === inv.id}
                          onClick={() => handleRevoke(inv.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-500/50 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                          <span>{revokingId === inv.id ? "Revoking…" : "Revoke"}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted">
                          <LockIcon className="h-3 w-3" /> Lead Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {revokeError ? <p className="mt-2 text-xs font-medium text-danger">{revokeError}</p> : null}
      </section>
    </div>
  );
}

function MemberRow({
  index,
  member,
  isLead,
  onRemove,
}: {
  index: number;
  member: { id?: string; name: string; initials: string; prn: string; branch: string; role: string | null; status: string; avatarUrl?: string | null };
  isLead: boolean;
  onRemove: () => void;
}) {
  const isLeader = member.role === "Leader";
  const isPending = member.status === "Invite Pending";

  return (
    <div
      className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border border-[#EBE3D7] bg-white transition-colors mb-2.5 hover:border-brand-primary/40`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {member.status === "Verified" ? (
          <Avatar src={getUserAvatarUrl(member)} seed={member.name || member.prn || "member"} className="h-10 w-10" />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
              isLeader
                ? "bg-brand-deep text-brand-cream"
                : isPending
                  ? "border border-dashed border-brand-primary/50 bg-brand-lightOrange/50 text-brand-primary"
                  : "bg-brand-deep/90 text-brand-cream"
            }`}
          >
            {member.initials}
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-brand-deep">{member.name}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                isLeader
                  ? "bg-brand-deep text-brand-cream"
                  : isPending
                    ? "border border-brand-amber/40 bg-brand-amber/20 text-brand-deep"
                    : "border border-brand-softline bg-brand-cream text-brand-deep"
              }`}
            >
              {isLeader ? "Team Leader" : isPending ? "Invite Outgoing" : "Member"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            {isPending ? `Dispatched to ${member.prn}` : `${member.prn} • ${member.branch}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPending ? (
          <span className="text-xs font-semibold text-brand-primary">Awaiting Accept</span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[11px] font-semibold text-brand-approved">
              <CheckIcon className="h-3 w-3" /> Active / Signed
            </span>
            {isLeader ? (
              <span title="Team leader cannot be removed" className="text-brand-muted cursor-not-allowed">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            ) : isLead ? (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-semibold text-danger transition-colors hover:text-red-700 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function IncomingInvitesTab() {
  const { incomingInvites, acceptInvite, declineInvite } = useTeam();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    <div className="space-y-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-brand-deep">Incoming Join Requests</h3>
          <p className="text-xs text-brand-muted">
            A team leader invited you to join their squad. Accept to become a member, or decline to keep looking.
          </p>
        </div>
        <span className="rounded-full border border-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-semibold text-brand-primary">
          {incomingInvites.length} Open Invite{incomingInvites.length !== 1 ? "s" : ""}
        </span>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-xs font-semibold text-danger">
          <AlertCircleIcon className="h-3.5 w-3.5" /> {actionError}
        </p>
      )}

      {incomingInvites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-softline bg-brand-cream p-4 text-sm text-brand-muted">
          No incoming team invitations right now. When a team leader invites you, it will appear here for you to
          accept or decline.
        </p>
      ) : (
        <div className="space-y-2.5">
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
                    Invited{" "}
                    {new Date(inv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
      )}
    </div>
  );
}