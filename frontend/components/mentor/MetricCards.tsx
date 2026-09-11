"use client";

import {
  UsersIcon,
  ClockIcon,
  CalendarClockIcon,
  ShieldCheckIcon,
  CheckIcon,
} from "../dashboard/icons";

export default function MetricCards({
  assignedTeams = 0,
  totalStudents = 0,
  pendingReviews = 0,
}: {
  assignedTeams?: number;
  totalStudents?: number;
  pendingReviews?: number;
}) {
  const cards = [
    {
      label: "Assigned Teams",
      value: String(assignedTeams),
      sub: `${totalStudents} Students`,
      icon: UsersIcon,
      iconBg: "bg-brand-cream border-brand-sand",
      iconColor: "text-brand-deep",
      valueColor: "text-brand-deep",
    },
    {
      label: "Pending Reviews",
      value: String(pendingReviews),
      sub: "Require Grading",
      icon: ClockIcon,
      iconBg: "bg-amber-warm/10 border-amber-warm/30",
      iconColor: "text-brand-primary",
      valueColor: "text-brand-primary",
    },
    {
      label: "Milestone Lock",
      value: "—",
      sub: "Set by active stage",
      icon: CalendarClockIcon,
      iconBg: "bg-brand-cream border-brand-sand",
      iconColor: "text-brand-deep",
      valueColor: "text-brand-deep",
    },
    {
      label: "Guide Role",
      value: "",
      sub: "",
      icon: CheckIcon,
      iconBg: "bg-brand-approved/10 border-brand-approved/20",
      iconColor: "text-brand-approved",
      custom: (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs font-bold text-brand-deep">Institute Evaluator</span>
          <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-approved" />
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center justify-between p-4 rounded-xl bg-white border border-brand-sand min-h-[84px]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-1">{card.label}</p>
            {card.custom ? (
              card.custom
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</span>
                <span className="text-[11px] text-brand-muted">{card.sub}</span>
              </div>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${card.iconBg}`}>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
