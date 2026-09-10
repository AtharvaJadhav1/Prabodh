"use client";

import Link from "next/link";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, ClockIcon, ArrowRightIcon, UserPlusIcon, LockIcon } from "./icons";

export default function MentorsCard() {
  const { facultyInviteStatus, facultyInviteEmail, isLead } = useTeam();

  const statusCopy = {
    none: {
      label: "No Faculty Mentor",
      tone: "border-brand-softline bg-brand-cream text-brand-charcoal/80",
      icon: UserPlusIcon,
    },
    sent: {
      label: "Invite Sent — Awaiting Approval",
      tone: "border-brand-warmBorder bg-brand-lightOrange text-brand-deep",
      icon: ClockIcon,
    },
    verified: {
      label: "Approved",
      tone: "border-brand-approved/30 bg-brand-approved/10 text-brand-approved",
      icon: CheckIcon,
    },
  }[facultyInviteStatus];

  const StatusIcon = statusCopy.icon;

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
          <GradCapIcon className="h-5 w-5 text-brand-amber" />
          Faculty Mentor
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusCopy.tone}`}
        >
          <StatusIcon className="h-3.5 w-3.5" /> {statusCopy.label}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-brand-softline bg-brand-cream p-4">
        <p className="text-xs font-medium text-brand-deep/70">
          {facultyInviteStatus === "none" && "Invite an institute faculty member to guide your team's SIH track."}
          {facultyInviteStatus === "sent" &&
            `Invitation sent to ${facultyInviteEmail} — they have not responded yet.`}
          {facultyInviteStatus === "verified" &&
            `Faculty mentor ${facultyInviteEmail ? `${facultyInviteEmail} ` : ""}is guiding your track.`}
        </p>
      </div>

      {isLead ? (
        <Link
          href="/dashboard/student/mentors"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-softline bg-white px-4 py-2.5 text-sm font-bold text-brand-charcoal/80 transition-colors hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary"
        >
          {facultyInviteStatus === "none" ? "Invite Mentor" : "Manage Invite"}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      ) : (
        <Link
          href="/dashboard/student/mentors"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-xs font-semibold text-brand-muted transition-colors hover:border-brand-primary/40 hover:bg-white"
        >
          <LockIcon className="h-4 w-4" />
          View Mentors (Read Only)
        </Link>
      )}
    </section>
  );
}