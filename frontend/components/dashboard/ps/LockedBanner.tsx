import { problemStatement } from "../../../data/studentDashboard";
import { ShieldCheckIcon, LockIcon } from "../icons";

export default function LockedBanner() {
  return (
    <div className="rounded-2xl border border-brand-approved/20 bg-brand-approved/5 p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-approved/10 text-brand-approved">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-snug text-brand-approved">
              Problem statement finalized &amp; locked
            </h2>
            <p className="mt-0.5 max-w-2xl text-sm text-brand-approved/85">
              Your group&apos;s PS has been approved by your mentor. All other pending requests have
              been automatically cancelled. No new requests can be submitted.
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-brand-approved px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm md:self-auto">
          <LockIcon className="h-4 w-4" />
          Locked for Evaluation
        </div>
      </div>
    </div>
  );
}
