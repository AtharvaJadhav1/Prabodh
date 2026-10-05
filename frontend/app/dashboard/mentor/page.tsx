"use client";

import { useMemo, useState } from "react";
import MentorShell from "../../../components/mentor/MentorShell";
import MetricCards from "../../../components/mentor/MetricCards";
import FilterBar from "../../../components/mentor/FilterBar";
import GroupCard from "../../../components/mentor/GroupCard";
import EmptyState from "../../../components/mentor/EmptyState";

import { useMentorTeams } from "../../../components/mentor/MentorTeamsProvider";
import MentorOnboardingTour from "../../../components/onboarding/MentorOnboardingTour";
import Link from "next/link";
import { DashboardIcon } from "../../../components/dashboard/icons";

type PsStatus = "pending" | "locked" | "awaiting" | "none";

function psStatusOf(row: {
  pendingInvite?: boolean;
  team: {
    problemStatement?: unknown;
    psPreferences?: Array<{ status: string }>;
  };
}): PsStatus {
  if (row.pendingInvite) return "pending";
  if (row.team.problemStatement) return "locked";
  if ((row.team.psPreferences ?? []).some((p) => p.status === "submitted")) return "awaiting";
  return "none";
}

function milestoneLabel(status: PsStatus): string {
  switch (status) {
    case "locked":
      return "PS Locked";
    case "awaiting":
      return "Awaiting Approval";
    case "pending":
      return "Invite Pending";
    default:
      return "Assigned";
  }
}

export default function MentorDashboardPage() {
  const { teams } = useMentorTeams();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("All Tracks");

  // Only teams you have accepted count as assigned. Pending invitations live in Group Requests.
  const assignedRows = useMemo(() => teams.filter((row) => !row.pendingInvite), [teams]);
  const pendingInviteCount = teams.length - assignedRows.length;

  const groups = useMemo(
    () =>
      assignedRows.map((row) => {
        const psStatus = psStatusOf(row);
        return {
          id: row.team.id,
          teamName: row.team.name,
          teamId: row.team.teamCode,
          memberCount: row.team.members?.length ?? 0,
          track: row.team.theme ?? "Unassigned",
          problemCode: row.team.problemStatement?.code ?? "—",
          problemTitle: row.team.problemStatement?.title ?? "No PS locked yet",
          leader: row.team.leader?.fullName ?? "—",
          leaderPrn: row.team.leader?.email ?? "",
          milestone: milestoneLabel(psStatus),
          domains: row.team.theme ? [row.team.theme] : [],
        };
      }),
    [assignedRows],
  );

  const trackOptions = useMemo(
    () => [
      "All Tracks",
      ...[...new Set(groups.map((g) => g.track).filter((t) => t && t !== "Unassigned"))].sort((a, b) => a.localeCompare(b)),
      ...(groups.some((g) => g.track === "Unassigned") ? ["Unassigned"] : []),
    ],
    [groups],
  );

  const filtered = useMemo(() => {
    let list = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.teamName.toLowerCase().includes(q) ||
          g.leaderPrn.toLowerCase().includes(q) ||
          g.problemTitle.toLowerCase().includes(q) ||
          g.leader.toLowerCase().includes(q),
      );
    }
    if (track !== "All Tracks") {
      list = list.filter((g) => g.track === track);
    }
    return list;
  }, [groups, search, track]);

  return (
    <>
      <MentorOnboardingTour />
      <MentorShell>
      <MetricCards
        assignedTeams={groups.length}
        totalStudents={groups.reduce((n, g) => n + g.memberCount, 0)}
      />

      {pendingInviteCount > 0 ? (
        <Link
          href="/dashboard/mentor/group-requests"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-brand-warmBorder bg-brand-lightOrange px-4 py-3 text-xs font-semibold text-brand-deep transition-colors hover:bg-brand-lightOrange/70"
        >
          <span>
            You have {pendingInviteCount} pending team invitation{pendingInviteCount === 1 ? "" : "s"} waiting for your
            decision.
          </span>
          <span className="shrink-0 font-bold text-brand-primary">Review →</span>
        </Link>
      ) : null}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        track={track}
        onTrackChange={setTrack}
        trackOptions={trackOptions}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DashboardIcon className="h-10 w-10" />}
          heading={groups.length === 0 ? "No teams allocated yet" : `No teams match "${search || track}"`}
          description="Teams appear here when students invite you by email or an admin assigns you."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTrack("All Tracks");
              }}
              className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <section id="tour-mentor-teams" className="mb-8">
          <div className="flex items-center justify-between mb-3 mt-6">
            <h2 className="text-base font-bold text-brand-deep">Assigned Teams</h2>
          </div>
          <div>
            {filtered.map((g) => (
              <GroupCard key={g.id ?? g.teamId} group={g} />
            ))}
          </div>
        </section>
      )}
      </MentorShell>
    </>
  );
}
