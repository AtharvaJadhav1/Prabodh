import { manualFormDefaults } from "../../../data/studentDashboard";
import { LockIcon, InfoIcon } from "../icons";

export default function ManualEntryForm() {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
            Student Innovation Track
          </span>
          <h3 className="mt-1 text-lg font-bold text-brand-deep">Manual Problem Statement Proposal</h3>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            Pitch an original engineering breakthrough not covered by official ministry listings. Once
            submitted, proposal requests require Faculty Mentor endorsement before slotting.
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-brand-softline bg-brand-cream p-2 text-brand-muted">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div
        id="locked-notice"
        className="flex items-center gap-2 rounded-xl border border-brand-softline bg-brand-cream p-3 text-sm text-brand-muted"
      >
        <InfoIcon className="h-5 w-5 shrink-0 text-brand-primary" />
        <span>Your group has already locked PS-1482. The form below is shown in reference review mode.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Problem Statement Title *</label>
          <input
            type="text"
            disabled
            aria-disabled="true"
            aria-describedby="locked-notice"
            value={manualFormDefaults.title}
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep opacity-90 cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Track Category *</label>
          <select
            disabled
            aria-disabled="true"
            aria-describedby="locked-notice"
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep cursor-not-allowed"
          >
            <option>{manualFormDefaults.track}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold text-brand-deep">Domain Fit *</label>
          <input
            type="text"
            disabled
            aria-disabled="true"
            aria-describedby="locked-notice"
            value={manualFormDefaults.domainFit}
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm text-brand-deep cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">
            Proposed Methodology &amp; Mathematical Rigor *
          </label>
          <textarea
            disabled
            aria-disabled="true"
            aria-describedby="locked-notice"
            rows={4}
            value={manualFormDefaults.methodology}
            className="w-full rounded-xl border border-brand-softline bg-brand-cream px-4 py-2.5 text-sm leading-relaxed text-brand-deep cursor-not-allowed"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-mono text-xs font-bold text-brand-deep">Target Technology Stack Chips</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {manualFormDefaults.techStack.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 font-mono text-xs font-bold text-brand-deep"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-describedby="locked-notice"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-sand px-5 py-2.5 text-sm font-bold text-brand-muted/60 cursor-not-allowed"
        >
          <LockIcon className="h-4 w-4" />
          Submission Disabled (Finalized)
        </button>
      </div>
    </div>
  );
}
