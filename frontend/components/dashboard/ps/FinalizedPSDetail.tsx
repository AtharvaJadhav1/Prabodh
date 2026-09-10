import { problemStatement } from "../../../data/studentDashboard";
import { ShieldCheckIcon, LockIcon } from "../icons";
import PlaceholderLink from "../PlaceholderLink";
import { ExternalLinkIcon } from "../icons";

export default function FinalizedPSDetail() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="absolute left-0 right-0 top-0 h-1.5 bg-brand-primary" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 font-mono text-xs font-bold text-brand-deep">
          {problemStatement.code}
        </span>
        {problemStatement.meta.map((m, i) => (
          <span
            key={i}
            className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-1 text-[11px] font-bold uppercase text-brand-deep"
          >
            {m.value}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-bold uppercase text-brand-approved">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          Status: Approved by Dr. Aman Singh
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-brand-deep sm:text-xl">
          Conversational AI-Powered Quantitative Trading &amp; Backtesting Platform
        </h3>
        <p className="max-w-3xl text-sm leading-relaxed text-brand-muted">
          Multi-agent autonomous framework leveraging LLMs and mathematical risk modeling to analyze
          real-time market microstructure, run algorithmic backtests, and detect anomaly transactions
          across high-frequency crypto and equity order books.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-brand-softline bg-brand-cream p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-muted">
              Mentor in Charge
            </span>
            <span className="text-sm font-bold text-brand-deep">Dr. Aman Singh (Dean R&amp;D)</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-brand-muted">
              Allocated Track
            </span>
            <span className="text-sm font-bold text-brand-deep">Track-A: FinTech Automation</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-xs text-brand-muted">
            <LockIcon className="h-4 w-4" />
            Locked for Round 1 Evaluation
          </span>
          <PlaceholderLink icon={<ExternalLinkIcon className="h-3.5 w-3.5" />} label="View Full Details" />
        </div>
      </div>
    </div>
  );
}
