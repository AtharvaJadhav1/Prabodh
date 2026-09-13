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

export default function RequestsTabs() {
  const [tab, setTab] = useState<1 | 2>(1);
  const { filledCount, invites, requests, requestResults } = useTeam();
  const incoming = requests.filter((_, i) => !requestResults[i]).length;

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
              chip={`${incoming} open`}
              chipStyle="bg-brand-primary text-white"
            />
          </div>
          <div className="flex items-center gap-1.5 pb-3 text-xs text-[#786C65]">
            <ClockIcon className="h-3.5 w-3.5" /> Synchronized with Clerk Auth
          </div>
        </div>
      </div>

      <div className="p-6">
        {tab === 1 ? <ActiveRosterTab /> : <IncomingRequestsTab />}
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
  const { members, invites, filledCount, facultyInviteStatus, facultyInviteEmail, revokeInvite, openDrawer, removeMember, isLead, capacity, team } = useTeam();
  const assignments = team?.mentorAssignments ?? [];

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-brand-deep">
              Confirmed Roster Members ({filledCount} of {capacity})
            </h3>
            <p className="text-xs text-brand-muted">Verified members on this team.</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {members.map((m, i) => (
            <MemberRow
              key={`${m.name}-${i}`}
              index={i}
              member={m}
              isLead={isLead}
              onRemove={() => removeMember(i)}
              onInviteNow={openDrawer}
            />
          ))}
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
                <tr className="border-b border-brand-softline bg-brand-cream text-[11px] font-bold uppercase tracking-wider text-brand-deep">
                  <th className="w-2/5 px-4 py-3">Recipient Email</th>
                  <th className="w-1/5 px-4 py-3">Sent Timestamp</th>
                  <th className="w-1/4 px-4 py-3">Delivery &amp; Status</th>
                  <th className="w-auto px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-softline">
                {invites.map((inv) => (
                  <tr key={inv.email} className="transition-colors hover:bg-brand-cream/50">
                    <td className="w-2/5 px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-lightOrange text-brand-primary">
                          <MailIcon className="h-3 w-3" />
                        </div>
                        <span className="truncate font-mono font-medium text-brand-deep">{inv.email}</span>
                      </div>
                    </td>
                    <td className="w-1/5 px-4 py-3.5 text-brand-charcoal/70">{inv.sentAt}</td>
                    <td className="w-1/4 px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-amber/30 bg-brand-amber/20 px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
                        <ClockIcon className="h-3 w-3 text-brand-primary" /> {inv.status}
                      </span>
                    </td>
                    <td className="w-auto px-4 py-3.5 text-right">
                      {isLead ? (
                        <button
                          type="button"
                          onClick={() => revokeInvite(inv.email)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-danger transition-colors hover:text-red-800 hover:underline"
                        >
                          <XIcon className="h-3 w-3" /> Revoke Invite
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
      </section>
    </div>
  );
}

function MemberRow({
  index,
  member,
  isLead,
  onRemove,
  onInviteNow,
}: {
  index: number;
  member: { name: string; initials: string; prn: string; branch: string; role: string | null; status: string; avatarUrl?: string | null };
  isLead: boolean;
  onRemove: () => void;
  onInviteNow: () => void;
}) {
  const isEmpty = member.status === "Empty";
  const isPending = member.status === "Invite Pending";
  const isLeader = member.role === "Leader";

  return (
    <div
      className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border border-[#EBE3D7] bg-white transition-colors mb-2.5 ${
        isEmpty ? "border-dashed hover:border-brand-primary" : "hover:border-brand-primary/40"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {member.status === "Verified" ? (
          <Avatar src={member.avatarUrl || null} seed={member.name || member.prn || "member"} className="h-10 w-10" />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
              isLeader
                ? "bg-brand-deep text-brand-cream"
                : isPending
                  ? "border border-dashed border-brand-primary/50 bg-brand-lightOrange/50 text-brand-primary"
                  : isEmpty
                    ? "border border-dashed border-brand-charcoal/20 text-brand-muted"
                    : member.initials === "PS"
                      ? "bg-brand-amber text-brand-deep"
                      : member.initials === "RK"
                        ? "bg-brand-cream border border-brand-softline text-brand-deep"
                        : member.initials === "SN"
                          ? "bg-brand-lightOrange text-brand-primary"
                          : "bg-brand-deep/90 text-brand-cream"
            }`}
          >
            {member.initials}
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-brand-deep">
              {isPending ? "Open Slot — Invite Pending" : isEmpty ? "Open Slot — Awaiting Member" : member.name}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                isLeader
                  ? "bg-brand-deep text-brand-cream"
                  : isPending
                    ? "border border-brand-amber/40 bg-brand-amber/20 text-brand-deep"
                    : isEmpty
                      ? "bg-brand-softline text-brand-charcoal/60"
                      : "border border-brand-softline bg-brand-cream text-brand-deep"
              }`}
            >
              {isLeader ? "Team Leader" : isPending ? "Invite Outgoing" : isEmpty ? "Unfilled" : "Member"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            {isPending
              ? `Dispatched to ${member.prn}`
              : isEmpty
                ? "Required to complete team formation and lock the official roster."
                : `${member.prn} • ${member.branch}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isPending || isEmpty ? (
          <>
            {isEmpty && isLead && (
              <button
                type="button"
                onClick={onInviteNow}
                className="shrink-0 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
              >
                Invite
              </button>
            )}
            {isEmpty && !isLead && (
              <span className="flex items-center gap-1 text-xs font-medium text-brand-muted">
                <LockIcon className="h-3 w-3" /> Lead Only
              </span>
            )}
            {isPending && (
              <span className="text-xs font-semibold text-brand-primary">Awaiting Accept</span>
            )}
          </>
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

function IncomingRequestsTab() {
  const { requests, filledCount, pendingRequestCount, teamName, capacity } = useTeam();
  const seatsLeft = capacity - filledCount;

  return (
    <div className="space-y-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-brand-deep">
            Student requests to join {teamName}
          </h3>
          <p className="text-xs text-brand-muted">
            Unassigned candidates seeking remaining squad slots.
          </p>
        </div>
        <span className="rounded-full border border-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-semibold text-brand-primary">
          {pendingRequestCount} Candidate{pendingRequestCount !== 1 ? "s" : ""} in Queue
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-softline bg-brand-cream p-4 text-sm text-brand-muted">
          No join requests yet.
        </p>
      ) : (
        requests.map((req, i) => (
          <CandidateCard key={i} index={i} req={req} seatsLeft={seatsLeft} />
        ))
      )}

      <div className="flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-xs text-brand-muted">
        <AlertCircleIcon className="h-4 w-4 shrink-0 text-brand-primary" />
        Approving a request registers the candidate on this team roster when the join-request API is enabled.
      </div>
    </div>
  );
}

function CandidateCard({
  index,
  req,
  seatsLeft,
}: {
  index: number;
  req: { initials: string; name: string; prn: string; branch: string; cgpa: string; skills: string[]; note: string; requestedAt: string; avatarClass: string };
  seatsLeft: number;
}) {
  const { approveRequest, rejectRequest, requestResults, isLead } = useTeam();
  const result = requestResults[index];

  return (
    <div className="space-y-3 rounded-xl border border-brand-softline bg-brand-cream/30 p-4 transition-all hover:border-brand-primary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${req.avatarClass}`}>
            {req.initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-brand-deep">{req.name}</h4>
              <span className="rounded border border-brand-softline bg-white px-2 py-0.5 font-mono text-[11px] text-brand-charcoal/80">
                PRN: {req.prn}
              </span>
            </div>
            <p className="text-xs text-brand-muted">
              {req.branch} • <span className="font-semibold text-brand-approved">CGPA: {req.cgpa}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-brand-muted">
          <ClockIcon className="h-3.5 w-3.5" />
          Requested {req.requestedAt}
        </div>
      </div>

      <div className="rounded-lg border border-brand-softline bg-white p-3 text-xs italic text-brand-charcoal/80">
        &ldquo;{req.note}&rdquo;
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold text-brand-muted">Skills:</span>
          {req.skills.map((skill) => (
            <span
              key={skill}
              className="rounded border border-brand-softline bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-deep"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end">
          {result ? (
            <p
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                result === "approved"
                  ? "bg-brand-approved/10 text-brand-approved"
                  : "bg-brand-cream text-brand-muted"
              }`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              {result === "approved" ? "Approved & added to roster" : "Request declined"}
            </p>
          ) : isLead ? (
            <>
              <button
                type="button"
                onClick={() => approveRequest(index)}
                disabled={seatsLeft <= 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand-approved px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-brand-sand disabled:text-brand-muted"
              >
                <CheckIcon className="h-3.5 w-3.5" /> Accept Request (+1 Member)
              </button>
              <button
                type="button"
                onClick={() => rejectRequest(index)}
                className="flex items-center gap-1 rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger transition-all hover:bg-red-50"
              >
                <XIcon className="h-3.5 w-3.5" /> Decline
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-softline bg-white px-3 py-1.5 text-xs font-medium text-brand-muted">
              <LockIcon className="h-3.5 w-3.5" /> View Only — Team Lead approves requests
            </span>
          )}
        </div>
      </div>
    </div>
  );
}