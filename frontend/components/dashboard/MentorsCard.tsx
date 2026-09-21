"use client";

import Link from "next/link";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, BriefcaseIcon, CheckIcon, ClockIcon, ArrowRightIcon } from "./icons";

function StatusPill({ label, pending }: { label: string; pending?: boolean }) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${
        pending ? "text-brand-muted" : "text-brand-approved"
      }`}
    >
      {pending ? <ClockIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />} {label}
    </span>
  );
}

export default function MentorsCard() {
  const { team, isLead } = useTeam();
  const assignments = team?.mentorAssignments ?? [];
  const invites = team?.mentorInvites ?? [];

  const faculty = assignments.find((a) => a.mentorType === "institute");
  const industrial = assignments.find((a) => a.mentorType === "industry");
  const pendingIndustry = invites.find((i) => i.mentorType === "industry");

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
        <GradCapIcon className="h-5 w-5 text-brand-amber" />
        Mentors
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Faculty mentor */}
        <div className="rounded-xl border border-brand-softline bg-brand-cream p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
            <GradCapIcon className="h-3.5 w-3.5" /> Institute / Faculty
          </p>
          {faculty ? (
            <>
              <p className="mt-1 text-sm font-bold text-brand-deep">{faculty.mentor.fullName}</p>
              <p className="text-xs text-brand-muted">
                {[faculty.mentor.department, faculty.mentor.institute].filter(Boolean).join(" · ") || faculty.mentor.email}
              </p>
              <p className="text-xs text-brand-muted">{faculty.mentor.email}</p>
              <StatusPill label="Assigned" />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-brand-muted">No faculty mentor assigned yet.</p>
              <p className="text-xs text-brand-muted">Team leaders can invite an institute faculty mentor.</p>
            </>
          )}
        </div>

        {/* Industrial mentor */}
        <div className="rounded-xl border border-brand-softline bg-brand-cream p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-muted">
            <BriefcaseIcon className="h-3.5 w-3.5" /> Industrial
          </p>
          {industrial ? (
            <>
              <p className="mt-1 text-sm font-bold text-brand-deep">{industrial.mentor.fullName}</p>
              <p className="text-xs text-brand-muted">
                {[industrial.mentor.institute, industrial.mentor.department].filter(Boolean).join(" · ") ||
                  industrial.mentor.institute ||
                  industrial.mentor.department}
              </p>
              <p className="text-xs text-brand-muted">{industrial.mentor.email}</p>
              <StatusPill label="Assigned" />
            </>
          ) : pendingIndustry ? (
            <>
              <p className="mt-1 text-sm font-bold text-brand-deep">{pendingIndustry.mentor?.fullName}</p>
              <p className="text-xs text-brand-muted">Awaiting acceptance from {pendingIndustry.invitedEmail}</p>
              <StatusPill label="Invitation sent" pending />
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-brand-muted">No industrial mentor assigned yet.</p>
              <p className="text-xs text-brand-muted">Your faculty mentor will invite an industry expert.</p>
            </>
          )}
        </div>
      </div>

      <Link
        href="/dashboard/student/mentors"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-softline px-4 py-2.5 text-sm font-bold"
      >
        {isLead ? "Invite or view mentors" : "View mentors"}
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}