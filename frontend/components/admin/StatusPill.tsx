export type TeamStatus = "forming" | "active" | "locked" | "disqualified";

type StatusBadge = { label: string; className: string };

export const STATUS_BADGES: Record<TeamStatus, StatusBadge> = {
  forming: { label: "Forming", className: "border-amber-200 bg-amber-50 text-amber-700" },
  active: { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  locked: { label: "Locked", className: "border-brand-warmBorder bg-brand-lightOrange text-brand-primary" },
  disqualified: { label: "Disqualified", className: "border-red-200 bg-red-50 text-red-600" },
};

export default function StatusPill({ status }: { status: TeamStatus }) {
  const badge = STATUS_BADGES[status] ?? { label: status, className: "border-brand-sand bg-brand-cream text-brand-muted" };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
      {badge.label}
    </span>
  );
}
