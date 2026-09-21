"use client";

import IndustryShell from "../../../../components/industry/IndustryShell";
import MentorCard from "../../../../components/industry/MentorCard";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryMentorsPage() {
  const { acceptedMentors, selectedMentorIds, toggleMentorSelection } = useIndustryMentor();

  return (
    <IndustryShell
      title="My Institute Mentors"
    >
      <div className="mx-auto max-w-7xl space-y-4">
        {acceptedMentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
            <p className="text-xs font-medium text-brand-muted">
              Accept an invite from the Pending Invites page to see Institute Mentors here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {acceptedMentors.map((m) => (
              <MentorCard
                key={m.instituteMentorId}
                mentor={m}
                selected={selectedMentorIds.includes(m.instituteMentorId)}
                onToggle={toggleMentorSelection}
              />
            ))}
          </div>
        )}
      </div>
    </IndustryShell>
  );
}
