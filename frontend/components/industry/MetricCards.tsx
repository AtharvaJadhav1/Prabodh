import { InboxIcon, BriefcaseIcon, FileCheckIcon, CalendarClockIcon } from "../dashboard/icons";

type Props = {
  pendingCount: number;
  acceptedMentorCount: number;
  visibleTeamCount: number;
};

export default function MetricCards({ pendingCount, acceptedMentorCount, visibleTeamCount }: Props) {
  const cards = [
    {
      label: "Pending Invites",
      value: String(pendingCount),
      sub: "Awaiting response",
      icon: InboxIcon,
      iconBg: "bg-brand-lightOrange border-brand-warmBorder",
      iconColor: "text-brand-primary",
      valueColor: "text-brand-deep",
    },
    {
      label: "Institute Mentors",
      value: String(acceptedMentorCount),
      sub: "Accepted invites",
      icon: BriefcaseIcon,
      iconBg: "bg-brand-approved/10 border-brand-approved/20",
      iconColor: "text-brand-approved",
      valueColor: "text-brand-deep",
    },
    {
      label: "Assigned Teams",
      value: String(visibleTeamCount),
      sub: "Visible to you",
      icon: FileCheckIcon,
      iconBg: "bg-brand-amber/10 border-brand-amber/30",
      iconColor: "text-brand-amber",
      valueColor: "text-brand-deep",
    },
    {
      label: "Industry Review Window",
      value: "Stage 1 Sync",
      sub: "",
      icon: CalendarClockIcon,
      iconBg: "bg-brand-cream border-brand-sand",
      iconColor: "text-brand-deep",
      valueColor: "text-brand-deep",
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-2xl border border-brand-sand bg-white p-4 shadow-xs"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-brand-muted">{card.label}</p>
            <p className="flex items-baseline gap-1">
              <span className={`text-lg font-extrabold ${card.valueColor}`}>{card.value}</span>
              {card.sub && <span className="text-xs font-normal text-brand-muted">{card.sub}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
