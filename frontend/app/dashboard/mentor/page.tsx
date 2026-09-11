"use client";

import { useEffect, useMemo, useState } from "react";
import MentorShell from "../../../components/mentor/MentorShell";
import MetricCards from "../../../components/mentor/MetricCards";
import FilterBar from "../../../components/mentor/FilterBar";
import GroupCard from "../../../components/mentor/GroupCard";
import EmptyState from "../../../components/mentor/EmptyState";
import GuidelinesBanner from "../../../components/mentor/GuidelinesBanner";
import EvaluateDrawer from "../../../components/mentor/EvaluateDrawer";
import { type MentorGroup } from "../../../data/mentorDashboard";
import { DashboardIcon } from "../../../components/dashboard/icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../components/auth/AuthProvider";

export default function MentorDashboardPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "evaluated">("all");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("All Tracks");
  const [groups, setGroups] = useState<MentorGroup[]>([]);
  const [reviewing, setReviewing] = useState<MentorGroup | null>(null);

  useEffect(() => {
    if (!session) return;
    void api<
      Array<{
        team: {
          id: string;
          name: string;
          teamCode: string;
          theme?: string | null;
          leader?: { fullName: string; email: string };
          problemStatement?: { code: string; title: string } | null;
          members?: unknown[];
          memberCap?: number;
          stageResults?: Array<{ published: boolean; weightedScore: string }>;
        };
      }>
    >("/mentors/me/teams")
      .then((rows) => {
        setGroups(
          rows.map((row) => {
            const published = row.team.stageResults?.find((r) => r.published);
            return {
              id: row.team.id,
              teamName: row.team.name,
              teamId: row.team.teamCode,
              capacity: `${row.team.members?.length ?? "?"}/${row.team.memberCap ?? 6}`,
              track: row.team.theme ?? "Unassigned",
              problemCode: row.team.problemStatement?.code ?? "—",
              problemTitle: row.team.problemStatement?.title ?? "No PS locked yet",
              leader: row.team.leader?.fullName ?? "—",
              leaderPrn: row.team.leader?.email ?? "",
              milestone: "Assigned",
              domains: row.team.theme ? [row.team.theme] : [],
              score: published ? Number(published.weightedScore) : undefined,
              publishStatus: published ? "published" : undefined,
            };
          }),
        );
      })
      .catch(() => setGroups([]));
  }, [session]);

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
        pendingReviews={groups.filter((g) => !g.score).length}
      />

      <FilterBar
        totalGroups={groups.length}
        pendingCount={groups.filter((g) => !g.score).length}
        evaluatedCount={groups.filter((g) => Boolean(g.score)).length}
        activeFilter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        track={track}
        onTrackChange={setTrack}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DashboardIcon className="h-10 w-10" />}
          heading={groups.length === 0 ? "No teams allocated yet" : `No teams match "${search || track}"`}
          description="Allocated teams from the backend appear here after an admin assigns you."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTrack("All Tracks");
                setFilter("all");
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
              <GroupCard key={g.id ?? g.teamId} group={g} status={g.score ? "evaluated" : "pending"} onReview={setReviewing} />
            ))}
          </div>
        </section>
      )}

      {reviewing ? <EvaluateDrawer group={reviewing} open onClose={() => setReviewing(null)} /> : null}

      <GuidelinesBanner />
    </MentorShell>
  );
}
