"use client";

import { UsersIcon, GradCapIcon } from "../dashboard/icons";

export default function MetricCards({
  assignedTeams = 0,
  totalStudents = 0,
}: {
  assignedTeams?: number;
  totalStudents?: number;
}) {
  const cards = [
    {
      label: "Assigned Teams",
      value: String(assignedTeams),
      desc: "Active teams under your guidance",
      icon: UsersIcon,
      stripe: "bg-brand-primary",
      iconBg: "bg-brand-primary/10 text-brand-primary",
    },
    {
      label: "Students Guided",
      value: String(totalStudents),
      desc: "Students under your mentorship",
      icon: GradCapIcon,
      stripe: "bg-brand-approved",
      iconBg: "bg-brand-approved/10 text-brand-approved",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-brand-primary/30 hover:shadow-md"
        >
          <span className={`absolute inset-x-0 top-0 h-1 ${card.stripe}`} aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted/90">{card.label}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">{card.value}</p>
              <p className="mt-1 text-xs font-semibold text-brand-muted">{card.desc}</p>
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${card.iconBg}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}