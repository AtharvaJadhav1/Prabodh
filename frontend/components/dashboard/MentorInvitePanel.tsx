"use client";

import { useTeam } from "./TeamProvider";
import { GradCapIcon, CheckIcon } from "./icons";

export default function MentorInvitePanel() {
  const { team } = useTeam();
  const assignments = team?.mentorAssignments ?? [];

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
        <GradCapIcon className="h-5 w-5 text-brand-primary" />
        Dual mentorship
      </h2>
      <p className="mt-2 text-sm text-brand-muted">
        Institute and industry mentors are allocated by the nodal admin. Invites from students are not used in production.
      </p>
      {assignments.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-brand-softline bg-brand-cream p-5 text-center text-sm text-brand-muted">
          No mentors assigned to this team yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {assignments.map((a) => (
            <li key={a.id} className="rounded-xl border border-brand-softline p-4">
              <p className="text-sm font-bold text-brand-deep">{a.mentor.fullName}</p>
              <p className="text-xs text-brand-muted">
                {a.mentorType} · {a.mentor.email}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                <CheckIcon className="h-3.5 w-3.5" /> Active assignment
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
