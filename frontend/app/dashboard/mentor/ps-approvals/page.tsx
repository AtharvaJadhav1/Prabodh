"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MentorShell from "../../../../components/mentor/MentorShell";
import EmptyState from "../../../../components/mentor/EmptyState";
import LoadingState from "../../../../components/LoadingState";
import PreferenceReviewCard, { type ReviewablePreference } from "../../../../components/mentor/PreferenceReviewCard";
import PsDetailCard from "../../../../components/dashboard/ps/PsDetailCard";
import { CheckIcon, ClockIcon, ShieldCheckIcon, UsersIcon } from "../../../../components/dashboard/icons";
import { apiPost } from "../../../../lib/api";
import { useMentorTeams, type MentorTeamRow } from "../../../../components/mentor/MentorTeamsProvider";

type Bucket = {
  id: string;
  teamName: string;
  teamCode: string;
  leaderName: string;
  memberCount: number;
  problemStatement: MentorTeamRow["team"]["problemStatement"];
  preferences: Array<{ id: string; preference: ReviewablePreference }>;
};

function toPreference(p: NonNullable<MentorTeamRow["team"]["psPreferences"]>[number]): ReviewablePreference {
  return {
    id: p.id,
    rank: p.rank,
    title: p.problemStatement?.title ?? p.title ?? "Untitled proposal",
    theme: p.problemStatement?.theme ?? p.theme ?? "",
    category: p.problemStatement?.category ?? p.category ?? "",
    organisation: p.problemStatement?.organisation ?? p.organisation ?? "",
    description: p.problemStatement?.description ?? p.description ?? "",
    sourceLabel: p.problemStatement ? `Catalog · ${p.problemStatement.code}` : "Student Proposal",
  };
}

function makeBucket(row: MentorTeamRow): Bucket {
  const preferences = (row.team.psPreferences ?? [])
    .filter((p) => p.status === "submitted")
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((p) => ({ id: p.id, preference: toPreference(p) }));
  return {
    id: row.team.id,
    teamName: row.team.name,
    teamCode: row.team.teamCode,
    leaderName: row.team.leader?.fullName ?? "—",
    memberCount: row.team.members?.length ?? 0,
    problemStatement: row.team.problemStatement ?? null,
    preferences,
  };
}

export default function MentorPsApprovalsPage() {
  const { teams, loading, error: loadError, refresh } = useMentorTeams();
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { awaiting, locked, notStarted } = useMemo(() => {
    const awaitingList: Bucket[] = [];
    const lockedList: Bucket[] = [];
    const notStartedList: Bucket[] = [];
    for (const row of teams) {
      if (row.pendingInvite) continue;
      if (row.team.problemStatement) {
        lockedList.push(makeBucket(row));
        continue;
      }
      const submitted = makeBucket(row);
      if (submitted.preferences.length > 0) {
        awaitingList.push(submitted);
        continue;
      }
      notStartedList.push(makeBucket(row));
    }
    return { awaiting: awaitingList, locked: lockedList, notStarted: notStartedList };
  }, [teams]);

  const handleApprove = async (teamId: string, preferenceId: string) => {
    setApprovingId(preferenceId);
    setError(null);
    try {
      await apiPost(`/teams/${teamId}/ps-preferences/${preferenceId}/approve`, {});
      await refresh(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve this preference");
    } finally {
      setApprovingId(null);
    }
  };

  const displayError = error ?? loadError;

  return (
    <MentorShell title="PS Approvals">
      <div className="flex flex-col gap-8">
        {displayError ? <p className="text-sm font-medium text-red-700">{displayError}</p> : null}

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ClockIcon className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-bold text-brand-deep">Awaiting Your Decision</h2>
            {awaiting.length > 0 ? (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                {awaiting.length}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="py-2">
              <LoadingState
                compact
                label="Loading approval status"
                steps={["Fetching pending approvals", "Checking problem statements"]}
              />
            </div>
          ) : awaiting.length > 0 ? (
            <div className="flex flex-col gap-5">
              {awaiting.map((team) => (
                <div
                  key={team.id}
                  className="flex flex-col gap-4 rounded-2xl border border-brand-sand bg-white p-5 max-sm:p-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-base font-bold text-brand-deep">{team.teamName}</h3>
                    <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 font-mono text-xs font-bold text-brand-deep break-all">
                      {team.teamCode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted">
                      <UsersIcon className="h-3.5 w-3.5" /> {team.memberCount} members
                    </span>
                    <span className="ml-auto break-words text-xs font-medium text-brand-muted max-sm:ml-0 max-sm:basis-full">
                      Lead: {team.leaderName}
                      <Link
                        href={`/dashboard/mentor/teams/${team.id}`}
                        className="ml-3 py-1 font-bold text-brand-primary hover:underline"
                      >
                        View Team
                      </Link>
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {team.preferences.map(({ id, preference }) => (
                      <PreferenceReviewCard
                        key={id}
                        preference={preference}
                        teamName={team.teamName}
                        busy={approvingId === id}
                        onApprove={(preferenceId) => handleApprove(team.id, preferenceId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClockIcon className="h-10 w-10" />}
              heading="No preferences awaiting review"
              description="Teams you mentor will appear here when they submit ranked problem statement preferences."
            />
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-brand-approved" />
            <h2 className="text-base font-bold text-brand-deep">Approved & Locked</h2>
            {locked.length > 0 ? (
              <span className="rounded-full bg-brand-approved/10 px-2 py-0.5 text-xs font-bold text-brand-approved">
                {locked.length}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="py-2">
              <LoadingState compact label="Loading locked submissions" steps={["Fetching approved problem statements"]} />
            </div>
          ) : locked.length > 0 ? (
            <div className="flex flex-col gap-5">
              {locked.map((team) => (
                <div key={team.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-base font-bold text-brand-deep">{team.teamName}</h3>
                    <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 font-mono text-xs font-bold text-brand-deep break-all">
                      {team.teamCode}
                    </span>
                    <span className="ml-auto inline-flex flex-wrap items-center gap-1 break-words text-xs font-medium text-brand-muted max-sm:ml-0 max-sm:basis-full">
                      <UsersIcon className="h-3.5 w-3.5" /> {team.memberCount} members · Lead: {team.leaderName}
                      <Link
                        href={`/dashboard/mentor/teams/${team.id}`}
                        className="ml-3 py-1 font-bold text-brand-primary hover:underline"
                      >
                        View Team
                      </Link>
                    </span>
                  </div>
                  {team.problemStatement ? (
                    <PsDetailCard ps={team.problemStatement} statusLabel="Locked by mentor" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-brand-softline bg-white px-4 py-3 text-sm text-brand-muted">
              No problem statements locked yet.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CheckIcon className="h-5 w-5 text-brand-muted" />
            <h2 className="text-base font-bold text-brand-deep">Awaiting Submission</h2>
            {notStarted.length > 0 ? (
              <span className="rounded-full bg-brand-muted/10 px-2 py-0.5 text-xs font-bold text-brand-muted">
                {notStarted.length}
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="py-2">
              <LoadingState compact label="Loading team list" steps={["Fetching teams without statements"]} />
            </div>
          ) : notStarted.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {notStarted.map((team) => (
                <div key={team.id} className="flex items-center gap-3 max-sm:flex-wrap rounded-xl border border-brand-softline bg-white p-4">
                  <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 font-mono text-xs font-bold text-brand-deep break-all">
                    {team.teamCode}
                  </span>
                  <div className="min-w-0 max-sm:basis-full max-sm:order-last">
                    <p className="break-words text-sm font-bold text-brand-deep">{team.teamName}</p>
                    <p className="break-words text-xs text-brand-muted">
                      Lead: {team.leaderName} · {team.memberCount} members
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/mentor/teams/${team.id}`}
                    className="ml-auto shrink-0 font-bold text-brand-primary hover:underline"
                  >
                    View Team
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-brand-softline bg-white px-4 py-3 text-sm text-brand-muted">
              All your teams have either submitted preferences or locked a problem statement.
            </p>
          )}
        </section>
      </div>
    </MentorShell>
  );
}
