import { deliverables } from "../../data/studentDashboard";
import {
  FileTextIcon,
  PresentationIcon,
  GithubIcon,
  ExternalLinkIcon,
  CheckIcon,
  ArrowRightIcon,
  LockIcon,
  FileCheckIcon,
} from "./icons";

const toneStyles: Record<string, string> = {
  approved: "bg-brand-approved/10 text-brand-approved",
  pending: "bg-brand-amber/15 text-brand-primary",
  text: "bg-brand-sand text-brand-charcoal/70",
};

function StatusChip({ tone, label }: { tone: string; label?: string }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${toneStyles[tone] ?? toneStyles.text}`}>
      <CheckIcon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function DeliverablesCard() {
  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
          <FileCheckIcon className="h-5 w-5 text-brand-primary" />
          Active Deliverable Submission
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-bold text-brand-primary">
            Round 1
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1 text-xs font-bold text-brand-approved">
            <CheckIcon className="h-3 w-3" /> Draft Saved
          </span>
        </div>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
        Upload all three deliverable components before the internal lock. Changes auto-sync to SIH
        portal after evaluation.
      </p>

      <ul className="mt-5 divide-y divide-brand-softline">
        {deliverables.map((item, i) => (
          <li key={i} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                item.tile === "file"
                  ? "border-brand-amber/25 bg-brand-amber/10 text-brand-primary"
                  : item.tile === "presentation"
                    ? "border-brand-deep/10 bg-brand-deep/5 text-brand-deep"
                    : "border-brand-approved/25 bg-brand-approved/10 text-brand-approved"
              }`}
            >
              {item.tile === "file" ? (
                <FileTextIcon className="h-5 w-5" />
              ) : item.tile === "presentation" ? (
                <PresentationIcon className="h-5 w-5" />
              ) : (
                <GithubIcon className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-brand-deep">{item.title}</p>
                <StatusChip tone={item.statusTone} label={item.status} />
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-brand-muted">{item.fileName}</p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-softline bg-white px-3 py-2 text-xs font-bold text-brand-charcoal transition-colors hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary"
            >
              {item.tile === "presentation" ? (
                <>
                  <ArrowRightIcon className="h-3.5 w-3.5" /> Upload New
                </>
              ) : (
                <>
                  <ExternalLinkIcon className="h-3.5 w-3.5" /> {item.tile === "github" ? "Open" : "View"}
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-warmBorder bg-brand-lightOrange p-4">
        <p className="text-xs font-medium leading-relaxed text-brand-deep">
          <strong className="font-bold">Submission Lock</strong> — hard lock at{" "}
          <span className="font-bold">September 15, 23:59 IST</span>. After locking, edits are frozen
          until the evaluation window.
        </p>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-brand-sand px-4 py-2.5 text-sm font-bold text-brand-muted"
        >
          <LockIcon className="h-4 w-4" /> Lock Submission
        </button>
      </div>
    </section>
  );
}