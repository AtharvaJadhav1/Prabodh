"use client";

import { useState, useMemo } from "react";
import MentorShell from "../../../components/mentor/MentorShell";
import MetricCards from "../../../components/mentor/MetricCards";
import FilterBar from "../../../components/mentor/FilterBar";
import GroupCard from "../../../components/mentor/GroupCard";
import EmptyState from "../../../components/mentor/EmptyState";
import GuidelinesBanner from "../../../components/mentor/GuidelinesBanner";
import {
  pendingGroups,
  evaluatedGroups,
  allGroups,
  type MentorGroup,
} from "../../../data/mentorDashboard";
import { DashboardIcon } from "../../../components/dashboard/icons";

export default function MentorDashboardPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "evaluated">("all");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("All Tracks");

  const filtered = useMemo(() => {
    let groups: MentorGroup[] =
      filter === "pending" ? pendingGroups : filter === "evaluated" ? evaluatedGroups : allGroups;

    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.filter(
        (g) =>
          g.teamName.toLowerCase().includes(q) ||
          g.leaderPrn.toLowerCase().includes(q) ||
          g.problemTitle.toLowerCase().includes(q) ||
          g.leader.toLowerCase().includes(q),
      );
    }

    if (track !== "All Tracks") {
      groups = groups.filter((g) => g.track.toLowerCase().includes(track.toLowerCase()));
    }

    return groups;
  }, [filter, search, track]);

  const pendingFiltered = filtered.filter((g) => pendingGroups.includes(g));
  const evaluatedFiltered = filtered.filter((g) => evaluatedGroups.includes(g));

  return (
    <MentorShell>
      <MetricCards />

      <FilterBar
        totalGroups={allGroups.length}
        pendingCount={pendingGroups.length}
        evaluatedCount={evaluatedGroups.length}
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
          heading={`No teams match "${search || track}"`}
          description="Try adjusting your search terms or filters."
          action={
            <button
              type="button"
              onClick={() => { setSearch(""); setTrack("All Tracks"); setFilter("all"); }}
              className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <>
          {/* Action Required */}
          {pendingFiltered.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-primary" />
                  <h2 className="text-base font-bold text-brand-deep">Action Required: Pending Evaluation</h2>
                  <span className="rounded-full border border-brand-amber/40 bg-brand-amber/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                    {pendingFiltered.length} Group{pendingFiltered.length !== 1 ? "s" : ""} Waiting
                  </span>
                </div>
                <span className="text-xs text-brand-muted">Please score before Stage 1 Roster Lock</span>
              </div>
              <div>
                {pendingFiltered.map((g) => (
                  <GroupCard key={g.teamId} group={g} status="pending" />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {evaluatedFiltered.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3 mt-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-approved" />
                  <h2 className="text-base font-bold text-brand-deep">Completed Evaluations</h2>
                  <span className="rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2 py-0.5 text-[11px] font-bold text-brand-approved">
                    {evaluatedFiltered.length} Group{evaluatedFiltered.length !== 1 ? "s" : ""} Graded
                  </span>
                </div>
                <span className="text-xs text-brand-muted">Scores recorded in Central University Matrix</span>
              </div>
              <div className="space-y-3">
                {evaluatedFiltered.map((g) => (
                  <GroupCard key={g.teamId} group={g} status="evaluated" />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <GuidelinesBanner />
    </MentorShell>
  );
}
