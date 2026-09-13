import { UsersIcon, BriefcaseIcon, AlertTriangleIcon, CalendarClockIcon } from "../dashboard/icons";
import type { platformMetrics } from "../../data/adminDashboard";

type Props = {
  metrics: ReturnType<typeof platformMetrics>;
};

export default function MetricCards({ metrics }: Props) {
  const cards = [
    {
      label: "Total Teams",
      value: String(metrics.totalTeams),
      desc: "Registered teams",
      icon: UsersIcon,
      stripe: "bg-[#C25E26]",
      iconBg: "bg-[#C25E26]/10 text-[#C25E26]",
      textValue: false,
    },
    {
      label: "Institute Mentors",
      value: String(metrics.totalInstituteMentors),
      desc: "Institute faculty assigned",
      icon: BriefcaseIcon,
      stripe: "bg-[#059669]",
      iconBg: "bg-[#059669]/10 text-[#059669]",
      textValue: false,
    },
    {
      label: "Pending Allocations",
      value: String(metrics.pendingAllocations),
      desc: "Teams unassigned",
      icon: AlertTriangleIcon,
      stripe: "bg-[#D97706]",
      iconBg: "bg-[#D97706]/10 text-[#D97706]",
      textValue: false,
    },
    {
      label: "Active Stage",
      value: metrics.activeStage,
      desc: "Current platform stage",
      icon: CalendarClockIcon,
      stripe: "bg-[#4A2810]",
      iconBg: "bg-[#4A2810]/10 text-[#4A2810]",
      textValue: true,
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative flex h-auto flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-brand-primary/30 hover:shadow-md sm:p-5"
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${card.stripe}`} aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold leading-none uppercase tracking-wider text-brand-muted/90">
              {card.label}
            </p>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 sm:h-9 sm:w-9 ${card.iconBg}`}
            >
              <card.icon className="h-4 w-4 text-current" />
            </div>
          </div>
          <div className="mt-1 flex flex-col">
            {card.textValue ? (
              <p className="text-lg font-bold leading-tight tracking-tight text-brand-deep sm:text-xl">
                {card.value}
              </p>
            ) : (
              <p className="text-2xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-3xl">
                {card.value}
              </p>
            )}
            <p className="mt-1 text-xs leading-snug font-medium text-brand-muted">{card.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}