"use client";

import type { AcceptedMentor } from "./IndustryMentorProvider";
import { CheckIcon } from "../dashboard/icons";

type Props = {
  mentor: AcceptedMentor;
  selected: boolean;
  onToggle: (instituteMentorId: string) => void;
};

export default function MentorCard({ mentor, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={() => onToggle(mentor.instituteMentorId)}
      className={`w-full rounded-2xl border p-5 text-left shadow-xs transition duration-200 hover:shadow-md ${
        selected ? "border-brand-primary bg-brand-lightOrange/50" : "border-brand-sand bg-white hover:border-brand-primary/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold tracking-wider text-white shadow-xs">
            {mentor.instituteMentorInitials}
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-deep">{mentor.instituteMentorName}</h3>
            <p className="text-xs text-brand-muted">{mentor.instituteMentorTitle}</p>
          </div>
        </div>
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
            selected ? "border-brand-primary bg-brand-primary" : "border-brand-sand bg-white"
          }`}
        >
          {selected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-brand-sand pt-3">
        <span className="h-2 w-2 rounded-full bg-brand-approved" />
        <p className="text-xs font-semibold text-brand-approved">
          {mentor.groupIds.length} Team{mentor.groupIds.length !== 1 ? "s" : ""} Shared
        </p>
      </div>
    </button>
  );
}
