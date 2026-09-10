"use client";

import { useState } from "react";
import type { IndustryMentor } from "../../data/mentorDashboard";
import { PencilIcon, TrashIcon } from "../dashboard/icons";

type Props = {
  mentor: IndustryMentor;
  mappedTeamCount: number;
  onEdit: (mentor: IndustryMentor) => void;
  onUnmapAll: (mentorId: string) => void;
  onRemove: (mentorId: string) => void;
};

export default function IndustryMentorCard({
  mentor,
  mappedTeamCount,
  onEdit,
  onUnmapAll,
  onRemove,
}: Props) {
  const [confirmAction, setConfirmAction] = useState<"unmap" | "remove" | null>(null);

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs transition duration-200 hover:shadow-md hover:border-brand-primary/40">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-brand-sand">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold tracking-wider text-white shadow-xs">
            {mentor.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-brand-deep">{mentor.name}</h3>
              <span className="rounded bg-brand-cream px-2 py-0.5 text-[10px] font-mono text-brand-muted border border-brand-sand">
                ID: {mentor.id}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-approved" />
              <p className="text-xs font-semibold text-brand-approved">Active Industry Guide</p>
              <span className="text-xs text-brand-muted">
                &middot; Mapped to {mappedTeamCount} Team{mappedTeamCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Edit Mentor Details"
            onClick={() => onEdit(mentor)}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Remove Mentor"
            onClick={() => setConfirmAction("remove")}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-red-50 hover:text-brand-overdue"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-3 py-4 text-xs">
        <div className="rounded-xl border border-brand-sand/70 bg-brand-cream p-2.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-brand-muted">
            Company / Org
          </span>
          <span className="block truncate font-bold text-brand-charcoal">{mentor.company}</span>
        </div>
        <div className="rounded-xl border border-brand-sand/70 bg-brand-cream p-2.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-brand-muted">
            Designation
          </span>
          <span className="block truncate font-bold text-brand-charcoal">{mentor.designation}</span>
        </div>
        <div className="rounded-xl border border-brand-sand/70 bg-brand-cream p-2.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-brand-muted">
            Official Email
          </span>
          <span className="block truncate font-medium text-brand-deep">{mentor.email}</span>
        </div>
        <div className="rounded-xl border border-brand-sand/70 bg-brand-cream p-2.5">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-brand-muted">
            Contact Phone
          </span>
          <span className="block font-medium text-brand-charcoal">{mentor.phone}</span>
        </div>
      </div>

      {/* Domain Expertise Tags */}
      <div className="pt-2">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-brand-muted">
          Domain Expertise
        </span>
        <div className="flex flex-wrap gap-1.5">
          {mentor.expertise.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-brand-sand bg-brand-cream px-2.5 py-1 text-[11px] font-semibold text-brand-charcoal"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Unmap Action */}
      {mappedTeamCount > 0 && (
        <div className="mt-3 pt-3 border-t border-brand-sand">
          {confirmAction === "unmap" ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-primary/40 bg-brand-lightOrange p-3">
              <p className="text-xs font-semibold text-brand-deep">
                Unmap {mentor.name} from all {mappedTeamCount} team{mappedTeamCount !== 1 ? "s" : ""}?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-brand-sand px-3 py-1 text-[11px] font-bold text-brand-muted hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUnmapAll(mentor.id);
                    setConfirmAction(null);
                  }}
                  className="rounded-lg bg-brand-primary px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-hover"
                >
                  Confirm Unmap
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAction("unmap")}
              className="w-full rounded-xl border border-dashed border-brand-primary/40 bg-brand-lightOrange px-3 py-2 text-[11px] font-bold text-brand-primary transition-colors hover:bg-brand-lightOrange/60"
            >
              Unmap from All Teams
            </button>
          )}
        </div>
      )}

      {/* Remove Mentor Confirmation */}
      {confirmAction === "remove" && (
        <div className="mt-3 rounded-xl border border-brand-overdue/40 bg-red-50 p-3">
          <p className="text-xs font-semibold text-brand-overdue">
            Remove {mentor.name} entirely? This unmaps them from all teams and deletes their record.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-brand-sand px-3 py-1 text-[11px] font-bold text-brand-muted hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onRemove(mentor.id);
                setConfirmAction(null);
              }}
              className="rounded-lg bg-brand-overdue px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700"
            >
              Remove Permanently
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
