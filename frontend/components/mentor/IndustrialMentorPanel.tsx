"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { TeamMentors } from "../../lib/types";
import { BriefcaseIcon, ClockIcon, CheckIcon, UserCheckIcon, PlusIcon } from "../dashboard/icons";
import InviteIndustrialMentorModal from "./InviteIndustrialMentorModal";

type Props = {
  teamId: string;
  teamName: string;
};

export default function IndustrialMentorPanel({ teamId, teamName }: Props) {
  const [details, setDetails] = useState<TeamMentors | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    api<TeamMentors>(`/teams/${teamId}/mentors`)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load mentors"));
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const industrial = details?.industrial ?? null;
  const pending = details?.pendingIndustryInvite ?? null;

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-deep">
          <BriefcaseIcon className="h-5 w-5 text-brand-primary" />
          Industrial Mentor
        </h3>
        {!industrial ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!!pending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {pending ? "Invite pending" : "Invite industrial mentor"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-brand-overdue">{error}</p> : null}

      <div className="mt-4">
        {!details ? (
          <p className="text-sm text-brand-muted">Loading…</p>
        ) : industrial ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-softline bg-brand-cream p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold tracking-wider text-white">
              {industrial.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-brand-deep">{industrial.name}</p>
              <p className="text-xs text-brand-muted">
                {[industrial.companyName, industrial.designation].filter(Boolean).join(" · ") || industrial.email}
              </p>
              <p className="text-xs text-brand-muted">{industrial.email}</p>
              {(industrial.domainExpertise ?? []).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {industrial.domainExpertise!.map((d) => (
                    <span
                      key={d}
                      className="rounded bg-brand-lightOrange px-2 py-0.5 text-[10px] font-semibold text-brand-primary"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-approved">
                <CheckIcon className="h-3.5 w-3.5" /> Assigned
              </span>
              {industrial.assignedBy?.name ? (
                <span className="text-[11px] text-brand-muted">
                  by {industrial.assignedBy.name} ({industrial.assignedBy.role})
                </span>
              ) : null}
            </div>
          </div>
        ) : pending ? (
          <div className="rounded-xl border border-brand-softline bg-brand-cream p-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-brand-primary" />
              <p className="text-sm font-bold text-brand-deep">
                Invitation sent to {pending.invitedEmail || "industrial mentor"}
              </p>
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              {pending.invitedByName ? `Sent by ${pending.invitedByName} · ` : ""}
              Awaiting acceptance. You cannot send another invitation until they respond.
            </p>
          </div>
        ) : (
          <p className="text-sm text-brand-muted">
            No industrial mentor assigned yet. Invite an industry expert from the registered directory to guide this
            team.
          </p>
        )}
      </div>

      <InviteIndustrialMentorModal
        open={modalOpen}
        teamId={teamId}
        teamName={teamName}
        onClose={() => setModalOpen(false)}
        onInvited={load}
      />
    </section>
  );
}