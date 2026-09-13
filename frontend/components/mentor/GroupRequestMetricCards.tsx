import Link from "next/link";
import { ClockIcon, CompassIcon } from "../dashboard/icons";

type Props = {
  pendingCount: number;
  psApprovalsCount: number;
};

export default function GroupRequestMetricCards({ pendingCount, psApprovalsCount }: Props) {
  const metrics = [
    {
      key: "pending",
      label: "Awaiting Decision",
      desc: "Pending group invitations",
      stripe: "bg-[#C25E26]",
      iconBg: "bg-orange-50 text-[#C25E26]",
      icon: <ClockIcon className="h-5 w-5" />,
      value: String(pendingCount),
      href: null,
    },
    {
      key: "ps-approvals",
      label: "PS Approvals",
      desc: "Teams awaiting your PS decision",
      stripe: "bg-[#059669]",
      iconBg: "bg-emerald-50 text-emerald-700",
      icon: <CompassIcon className="h-5 w-5" />,
      value: String(psApprovalsCount),
      href: "/dashboard/mentor/ps-approvals",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {metrics.map((m) => {
        const card = (
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <span className={`absolute inset-x-0 top-0 h-1 ${m.stripe}`} aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted/90">{m.label}</p>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${m.iconBg}`}>
                {m.icon}
              </div>
            </div>
            <p className="mt-2 text-3xl font-extrabold leading-none tracking-tight text-brand-deep sm:text-4xl">
              {m.value}
            </p>
            <p className="mt-1 text-xs font-semibold text-brand-muted">{m.desc}</p>
          </div>
        );

        return m.href ? (
          <Link key={m.key} href={m.href} className="block">
            {card}
          </Link>
        ) : (
          <div key={m.key}>{card}</div>
        );
      })}
    </div>
  );
}
