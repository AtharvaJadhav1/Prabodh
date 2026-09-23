import type { MentorGroup, GroupStatus } from "../../data/mentorDashboard";
import Link from "next/link";
import {
  AwardIcon,
  FileTextIcon,
  ArrowRightIcon,
  UsersIcon,
} from "../dashboard/icons";

type Props = {
  group: MentorGroup;
  status: GroupStatus;
  onReview?: (group: MentorGroup) => void;
};

export default function GroupCard({ group, status, onReview }: Props) {
  const isPending = status === "pending";
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

        {/* Leader + Score/Milestone */}
        <div className="flex items-center gap-4 text-[11px] text-brand-muted flex-wrap">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 shrink-0 text-brand-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="7" r="4" />
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-brand-deep">{group.leader}</span>
            <span className="font-mono text-brand-muted">({group.leaderPrn})</span>
          </div>
          {isPending ? (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-amber" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Milestone: <strong className="text-brand-deep">{group.milestone}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-approved" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Score: <strong className="text-brand-approved">{group.score} / 100 (Grade {group.grade})</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap shrink-0 items-center justify-end gap-3 border-t border-brand-sand pt-3 lg:border-t-0 lg:pt-0">
        {isPending ? (
          <>
            <span className="hidden items-center gap-1 rounded-md border border-brand-amber/30 bg-brand-amber/10 px-2.5 py-1 text-xs font-semibold text-brand-primary sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" />
              Review Pending
            </span>
            <button
              type="button"
              onClick={() => onReview?.(group)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-primary px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-hover"
            >
              <AwardIcon className="h-3.5 w-3.5" />
              <span>Review Submission</span>
            </button>
          </>
        ) : (
          <>
            {group.publishStatus === "submitted" ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-amber/30 bg-brand-amber/10 px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                Submitted — pending publish
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                Published to students
              </span>
            )}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-sand bg-white px-3 text-xs font-bold text-brand-deep transition-colors hover:bg-brand-cream"
            >
              <FileTextIcon className="h-3.5 w-3.5 text-brand-muted" />
              <span>View Rubric</span>
            </button>
            <button
              type="button"
              onClick={() => onReview?.(group)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-brand-sand bg-brand-cream px-3.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-lightOrange"
            >
              <span>Edit Score</span>
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </>
        )}
        {group.id ? (
          <Link
            href={`/dashboard/mentor/teams/${group.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-sand bg-white px-3 text-xs font-bold text-brand-deep transition-colors hover:border-brand-primary/40 hover:bg-brand-cream"
          >
            <UsersIcon className="h-3.5 w-3.5 text-brand-muted" />
            <span>View Team</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
