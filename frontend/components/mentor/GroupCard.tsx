import type { MentorGroup } from "../../data/mentorDashboard";
import Link from "next/link";
import { UsersIcon, ChevronRightIcon } from "../dashboard/icons";

type Props = {
  group: MentorGroup;
};

export default function GroupCard({ group }: Props) {
  const capacityColor = group.capacity === "6/6" ? "bg-brand-approved/10 text-brand-approved" : "bg-brand-lightOrange text-brand-primary";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl bg-white border border-brand-sand hover:border-brand-primary/40 shadow-xs transition-all hover:shadow-md gap-4 mb-3">
      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header Line */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <h3 className="text-base font-bold text-brand-deep">{group.teamName}</h3>
          <span className="rounded border border-brand-sand bg-brand-cream px-2 py-0.5 font-mono text-[11px] text-brand-muted">
            {group.teamId}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${capacityColor}`}>
            Team: {group.capacity}
          </span>
          <span className="rounded-full border border-brand-sand bg-brand-cream px-2 py-0.5 text-[11px] font-medium text-brand-deep">
            {group.track}
          </span>
        </div>

        {/* Problem Title */}
        <p className="text-xs font-semibold text-brand-deep mb-1 line-clamp-1">
          <span className="mr-1.5 font-bold text-brand-primary">{group.problemCode}:</span>
          {group.problemTitle}
        </p>

        {/* Leader + Milestone */}
        <div className="flex items-center gap-4 text-[11px] text-brand-muted flex-wrap">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="7" r="4" />
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-brand-deep">{group.leader}</span>
            <span className="font-mono text-brand-muted">({group.leaderPrn})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-amber" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Milestone: <strong className="text-brand-deep">{group.milestone}</strong></span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center justify-end border-t border-brand-sand pt-3 lg:border-t-0 lg:pt-0">
        {group.id ? (
          <Link
            href={`/dashboard/mentor/teams/${group.id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#fbd3bc] bg-[#fff5ee] px-4 py-2 text-xs font-semibold text-[#d95c26] shadow-sm transition-all hover:bg-[#ffe8d6] active:scale-[0.98]"
          >
            <UsersIcon className="h-3.5 w-3.5 text-[#d95c26]" />
            <span>View Team</span>
            <ChevronRightIcon className="h-3.5 w-3.5 text-[#d95c26]/70" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
