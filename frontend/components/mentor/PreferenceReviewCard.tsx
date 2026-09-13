"use client";

import { useState } from "react";
import { CheckIcon } from "../dashboard/icons";
import ConfirmDialog from "./ConfirmDialog";

export type ReviewablePreference = {
  id: string;
  rank: number;
  title: string;
  theme: string;
  category: string;
  organisation: string;
  description: string;
  sourceLabel: string;
};

type Props = {
  preference: ReviewablePreference;
  teamName: string;
  busy: boolean;
  onApprove: (preferenceId: string) => void;
};

export default function PreferenceReviewCard({ preference, teamName, busy, onApprove }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-brand-sand bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-brand-sand bg-brand-cream px-2.5 py-0.5 text-[11px] font-bold text-brand-deep">
            Preference #{preference.rank}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-sand bg-brand-cream px-2.5 py-0.5 text-[11px] font-bold text-brand-deep">
            {preference.sourceLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-sand bg-brand-cream px-2.5 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
            {preference.category}
          </span>
        </div>
        <h3 className="text-base font-bold text-brand-deep">{preference.title}</h3>
        <p className="mt-1 text-xs font-medium text-brand-muted">
          {preference.theme} · {preference.organisation}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-charcoal">{preference.description}</p>

        <div className="mt-4 flex justify-end border-t border-brand-sand pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-deep px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Approve &amp; Lock This Problem Statement
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Lock this problem statement?"
        message={`This will permanently lock ${teamName}'s problem statement to "${preference.title}". The other preferences will be rejected. This cannot be undone.`}
        confirmLabel="Approve & Lock"
        confirmColor="primary"
        onConfirm={() => {
          setConfirmOpen(false);
          onApprove(preference.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
