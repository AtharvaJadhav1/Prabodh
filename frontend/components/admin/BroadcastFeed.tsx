import type { Broadcast } from "../../data/adminDashboard";
import { audienceLabels } from "../../data/adminDashboard";

type Props = {
  broadcasts: Broadcast[];
};

export default function BroadcastFeed({ broadcasts }: Props) {
  if (broadcasts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
        <p className="text-xs font-medium text-brand-muted">No broadcasts sent yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {broadcasts.map((b) => (
        <div key={b.id} className="rounded-2xl border border-brand-sand bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-brand-deep">{b.title}</h3>
            <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary">
              {audienceLabels[b.audience]}
            </span>
          </div>
          <p className="mt-2 text-xs text-brand-charcoal">{b.message}</p>
          <p className="mt-3 text-[11px] text-brand-muted">
            Sent by {b.sentBy} &middot; {b.sentAt}
          </p>
        </div>
      ))}
    </div>
  );
}
