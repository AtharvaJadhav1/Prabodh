"use client";

import { useMemo, useState } from "react";
import MentorShell from "../../../components/mentor/MentorShell";
import MetricCards from "../../../components/mentor/MetricCards";
import FilterBar from "../../../components/mentor/FilterBar";
import GroupCard from "../../../components/mentor/GroupCard";
import EmptyState from "../../../components/mentor/EmptyState";

import { useMentorTeams } from "../../../components/mentor/MentorTeamsProvider";
import { DashboardIcon } from "../../../components/dashboard/icons";

export default function MentorDashboardPage() {
  const { teams } = useMentorTeams();
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("All Tracks");

  const groups = useMemo(
    () =>
      teams.map((row) => ({
        id: row.team.id,
        teamName: row.team.name,
        teamId: row.team.teamCode,
        capacity: `${row.team.members?.length ?? "?"}/${row.team.memberCap ?? 6}`,
        track: row.team.theme ?? "Unassigned",
        problemCode: row.team.problemStatement?.code ?? "—",
        problemTitle: row.team.problemStatement?.title ?? "No PS locked yet",
        leader: row.team.leader?.fullName ?? "—",
        leaderPrn: row.team.leader?.email ?? "",
        milestone: row.pendingInvite ? "Invite pending — accept in Group Requests" : "Assigned",
        domains: row.team.theme ? [row.team.theme] : [],
      })),
    [teams],
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
      list = list.filter((g) => g.track.toLowerCase().includes(track.toLowerCase()));
    }
    return list;
  }, [groups, search, track]);

  return (
    <MentorShell>
      <MetricCards
        assignedTeams={groups.length}
        totalStudents={groups.reduce((n, g) => n + Number.parseInt(g.capacity.split("/")[0] || "0", 10) || 0, 0)}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        track={track}
        onTrackChange={setTrack}
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
        <section className="mb-8">
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
  );
}
