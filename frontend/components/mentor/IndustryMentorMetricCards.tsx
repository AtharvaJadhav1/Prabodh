import type { IndustryMentor } from "../../data/mentorDashboard";
import {
  BriefcaseIcon,
  UsersIcon,
  AlertTriangleIcon,
  CalendarClockIcon,
} from "../dashboard/icons";

type Props = {
  mentors: IndustryMentor[];
  totalTeams: number;
};

export default function IndustryMentorMetricCards({ mentors, totalTeams }: Props) {
  const mappedTeamIds = new Set(mentors.flatMap((m) => m.mappedTeamIds));
  const mappedCount = mappedTeamIds.size;
  const unmappedCount = totalTeams - mappedCount;

  const cards = [
    {
      label: "Active Industry Mentors",
      value: String(mentors.length),
      sub: "Onboarded",
      icon: BriefcaseIcon,
      iconBg: "bg-brand-lightOrange border-brand-warmBorder",
      iconColor: "text-brand-primary",
      valueColor: "text-brand-deep",
    },
    {
      label: "Mapped Student Teams",
      value: String(mappedCount),
      sub: `/ ${totalTeams} Teams`,
      icon: UsersIcon,
      iconBg: "bg-brand-approved/10 border-brand-approved/20",
      iconColor: "text-brand-approved",
      valueColor: "text-brand-deep",
    },
    {
      label: "Unmapped Cohorts",
      value: String(unmappedCount),
      sub: "Teams",
      icon: AlertTriangleIcon,
      iconBg: "bg-brand-amber/10 border-brand-amber/30",
      iconColor: "text-brand-amber",
      valueColor: "text-brand-amber",
      valueSuffix: unmappedCount > 0 ? <span className="text-xs font-semibold text-brand-primary ml-1">(Action)</span> : null,
    },
    {
      label: "Industry Review Window",
      value: "Stage 1 Sync",
      sub: "",
      icon: CalendarClockIcon,
      iconBg: "bg-brand-cream border-brand-sand",
      iconColor: "text-brand-deep",
      valueColor: "text-brand-deep",
      custom: (
        <p className="mt-0.5 text-lg font-extrabold text-brand-deep">Stage 1 Sync</p>
      ),
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-2xl border border-brand-sand bg-white p-4 shadow-xs"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}
          >
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-brand-muted">{card.label}</p>
            {card.custom ?? (
              <p className="flex items-baseline gap-1">
                <span className={`text-lg font-extrabold ${card.valueColor}`}>
                  {card.value}
                </span>
                {card.sub && (
                  <span className="text-xs font-normal text-brand-muted">{card.sub}</span>
                )}
                {card.valueSuffix}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
