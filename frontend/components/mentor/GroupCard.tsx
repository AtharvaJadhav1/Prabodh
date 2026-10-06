import type { MentorGroup } from "../../data/mentorDashboard";
import Link from "next/link";
import { UsersIcon, ChevronRightIcon, FileTextIcon, UserIcon } from "../dashboard/icons";

type Props = {
  group: MentorGroup;
};

export default function GroupCard({ group }: Props) {
  const hasProblemStatement = group.problemCode !== "—" && group.problemTitle !== "No PS locked yet";

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm transition-all duration-200 hover:border-[#D95D28]/40 hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-3.5">
      {/* Header Row: Identity & Action */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left Group: Team Name + Code */}
        <div className="flex min-w-0 items-center gap-2 flex-wrap">
          <h3 className="min-w-0 break-words text-lg font-bold text-stone-900">{group.teamName}</h3>
          <span className="rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-600 shrink-0">
            {group.teamId}
          </span>
        </div>

        {/* Right Group: View Team Button */}
        <div className="flex items-center gap-2.5 shrink-0 max-sm:w-full">
          {group.id ? (
            <Link
              href={`/dashboard/mentor/teams/${group.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-center max-sm:py-2.5 rounded-xl border border-stone-200 px-3.5 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
            >
              <UsersIcon className="h-4 w-4" />
              <span>View Team</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Body Details: Structured & Readable */}
      <div className="flex flex-col gap-2.5 pt-1 border-t border-stone-100">
        {/* Problem Statement Row */}
        <div className="flex items-start gap-2 text-sm">
          <FileTextIcon className="mt-0.5 w-4 h-4 text-stone-400 shrink-0" />
          <span className="text-stone-500 font-medium max-sm:shrink-0">Problem Statement:</span>
          <span className={`min-w-0 break-words ${hasProblemStatement ? "text-stone-800 font-medium" : "text-stone-400 italic"}`}>
            {hasProblemStatement ? `${group.problemCode}: ${group.problemTitle}` : "None locked yet"}
          </span>
        </div>

        {/* Team Lead & Peer Count Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-stone-600">
          <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
            <UserIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-800">{group.leader}</span>
            <span className="min-w-0 break-all text-stone-400">({group.leaderPrn})</span>
          </div>
          <span className="text-stone-300">•</span>
          <div className="flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5 text-stone-400" />
            <span>{group.memberCount} {group.memberCount === 1 ? "Peer" : "Peers"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
