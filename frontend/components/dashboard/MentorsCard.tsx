"use client";

import Link from "next/link";
import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon, ArrowRightIcon } from "./icons";

function mentorKindLabel(kind: string) {
  return kind === "industry" ? "Industry Mentor" : "Institute Mentor";
}

export default function MentorsCard() {
  const { team, isLead } = useTeam();
  const assignments = team?.mentorAssignments ?? [];

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
        <GradCapIcon className="h-5 w-5 text-brand-amber" />
        Mentors
      </h2>
      {assignments.length === 0 ? (
        <p className="mt-3 text-sm text-brand-muted">
          No mentors assigned yet. Team leaders can invite faculty and industry mentors by email.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assignments.map((a) => (
            <li key={a.id} className="rounded-xl border border-brand-softline bg-brand-cream p-3">
              <p className="text-sm font-bold text-brand-deep">{a.mentor.fullName}</p>
              <p className="text-xs text-brand-muted">
                {mentorKindLabel(a.mentorType)} · {a.mentor.email}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-brand-approved">
                <CheckIcon className="h-3 w-3" /> Assigned
              </span>
            </li>
          ))}
        </ul>
      )}
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
