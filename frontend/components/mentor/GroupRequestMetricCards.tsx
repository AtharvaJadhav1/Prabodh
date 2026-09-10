import { mentorMaxCap } from "../../data/mentorDashboard";

type Props = {
  pendingCount: number;
  acceptedCount: number;
  domainMatchPercent: number;
};

const metrics = [
  {
    key: "pending",
    label: "Awaiting Decision",
    border: "border-brand-deep/80",
    iconBg: "bg-brand-lightOrange",
    icon: (
      <svg className="h-4 w-4 text-brand-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    value: (p: Props) => p.pendingCount,
    chip: (p: Props) =>
      p.pendingCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-amber/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" />
          Needs review
        </span>
      ) : null,
  },
  {
    key: "mentored",
    label: "Total Mentored",
    border: "border-brand-deep/80",
    iconBg: "bg-brand-approved/10",
    icon: (
      <svg className="h-4 w-4 text-brand-approved" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    value: (p: Props) => p.acceptedCount,
    chip: (p: Props) => (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-deep px-2 py-0.5 text-[10px] font-bold text-white">
        Max Cap: {mentorMaxCap}
      </span>
    ),
  },
  {
    key: "response",
    label: "Avg. Response Time",
    border: "border-brand-deep/80",
    iconBg: "bg-brand-lightOrange",
    icon: (
      <svg className="h-4 w-4 text-brand-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    value: () => "4.2 Hours",
    chip: () => null,
  },
  {
    key: "domain",
    label: "Domain Match %",
    border: "border-brand-deep/80",
    iconBg: "bg-brand-approved/10",
    icon: (
      <svg className="h-4 w-4 text-brand-approved" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    value: (p: Props) => `${p.domainMatchPercent}%`,
    chip: (p: Props) => (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[10px] font-bold text-brand-approved">
        {p.domainMatchPercent >= 50 ? "Strong" : "Moderate"} match
      </span>
    ),
  },
];

export default function GroupRequestMetricCards({ pendingCount, acceptedCount, domainMatchPercent }: Props) {
  const props: Props = { pendingCount, acceptedCount, domainMatchPercent };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.key}
          className={`rounded-xl border ${m.border} bg-white p-4 shadow-sm transition-all hover:shadow-md`}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
              {m.icon}
            </div>
            <span className="text-xs font-semibold text-brand-muted">{m.label}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-extrabold tracking-tight text-brand-deep">
              {m.value(props)}
            </span>
            {m.chip(props)}
          </div>
        </div>
      ))}
    </div>
  );
}
