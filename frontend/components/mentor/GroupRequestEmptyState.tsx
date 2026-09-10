import { InboxIcon } from "../dashboard/icons";

export default function GroupRequestEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-sand bg-white py-16 px-6 text-center shadow-sm">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-cream">
        <InboxIcon className="h-8 w-8 text-brand-muted" />
      </div>
      <h3 className="text-lg font-bold text-brand-deep">All caught up!</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-brand-muted">
        No pending group requests right now. New allocations from the Nodal Admin will appear here.
      </p>
    </div>
  );
}
