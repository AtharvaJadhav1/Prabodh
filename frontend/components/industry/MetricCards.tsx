"use client";

import { InboxIcon, BriefcaseIcon, FileCheckIcon } from "../dashboard/icons";

type Props = {
  pendingCount: number;
  acceptedMentorCount: number;
  visibleTeamCount: number;
};

export default function MetricCards({ pendingCount, acceptedMentorCount, visibleTeamCount }: Props) {
  const cards = [
    {
      label: "PENDING INVITES",
      value: String(pendingCount),
      desc: "Awaiting student response",
      icon: InboxIcon,
      stripe: "bg-[#C25E26]",
      iconBg: "bg-[#C25E26]/10 text-[#C25E26]",
    },
    {
      label: "INSTITUTE MENTORS",
      value: String(acceptedMentorCount),
      desc: "Accepted institutional invites",
      icon: BriefcaseIcon,
      stripe: "bg-[#D97706]",
      iconBg: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "ASSIGNED TEAMS",
      value: String(visibleTeamCount),
      desc: "Active teams visible to you",
      icon: FileCheckIcon,
      stripe: "bg-[#059669]",
      iconBg: "bg-emerald-500/10 text-emerald-700",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-brand-primary/30 hover:shadow-md"
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${card.stripe}`} aria-hidden="true" />
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted/90">{card.label}</p>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-4xl">{card.value}</p>
          <p className="mt-2 text-xs font-medium text-brand-muted">{card.desc}</p>
        </div>
      ))}
    </div>
  );
}