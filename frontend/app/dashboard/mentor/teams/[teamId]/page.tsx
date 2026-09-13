"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MentorShell from "../../../../../components/mentor/MentorShell";
import EmptyState from "../../../../../components/mentor/EmptyState";
import PreferenceReviewCard, { type ReviewablePreference } from "../../../../../components/mentor/PreferenceReviewCard";
import TeamRosterTable, { type RosterMember } from "../../../../../components/mentor/TeamRosterTable";
import PsDetailCard from "../../../../../components/dashboard/ps/PsDetailCard";
import { AlertCircleIcon, ClockIcon } from "../../../../../components/dashboard/icons";
import { api, apiPost, ApiError } from "../../../../../lib/api";
import { useAuth } from "../../../../../components/auth/AuthProvider";
import type { PortalTeam } from "../../../../../lib/types";

export default function MentorTeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const { session } = useAuth();
  const [team, setTeam] = useState<PortalTeam | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!teamId || !session) return;
    api<PortalTeam>(`/teams/${teamId}`)
      .then((detail) => {
        setTeam(detail);
        setDenied(false);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setDenied(true);
        } else {
          setError(err instanceof Error ? err.message : "Could not load team");
        }
      });
  }, [teamId, session]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (preferenceId: string) => {
    if (!teamId) return;
    setApprovingId(preferenceId);
    try {
      await apiPost(`/teams/${teamId}/ps-preferences/${preferenceId}/approve`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve this preference");
    } finally {
      setApprovingId(null);
    }
  };

  if (denied) {
    return (
      <MentorShell title="Team Detail">
        <EmptyState
          icon={<AlertCircleIcon className="h-10 w-10" />}
          heading="Access denied"
          description="You can only view a team's details once you have accepted their mentor invitation."
        />
      </MentorShell>
    );
  }

  if (!team) {
    return (
      <MentorShell title="Team Detail">
        {error ? (
          <EmptyState icon={<AlertCircleIcon className="h-10 w-10" />} heading="Could not load team" description={error} />
        ) : (
          <p className="text-sm text-brand-muted">Loading team…</p>
        )}
      </MentorShell>
    );
  }

  const ps = team.problemStatement;
  const submitted = (team.psPreferences ?? []).filter((p) => p.status === "submitted");
  const roster: RosterMember[] = team.members.map((m) => ({
    id: m.id,
    name: m.user?.fullName ?? m.invitedEmail,
    email: m.user?.email ?? m.invitedEmail,
    department: m.user?.department,
    isLeader: m.user?.id === team.leaderUserId,
    inviteStatus: m.inviteStatus,
  }));

  return (
    <MentorShell title={team.name} subtitle={`Team ${team.teamCode}`}>
      <div className="flex flex-col gap-6">
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

        {ps ? (
          <>
            <PsDetailCard ps={ps} statusLabel="Locked by mentor" />
            <h3 className="text-base font-bold text-brand-deep">Team Roster</h3>
            <TeamRosterTable members={roster} />
          </>
        ) : submitted.length > 0 ? (
          <>
            <div>
              <h2 className="text-lg font-bold text-brand-deep">Review &amp; Finalize Problem Statement for {team.name}</h2>
              <p className="mt-1 text-sm text-brand-muted">
                The team has submitted {submitted.length} ranked preference{submitted.length > 1 ? "s" : ""}. Approve
                exactly one to lock it as their official problem statement.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              {submitted
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((p) => {
                  const preference: ReviewablePreference = {
                    id: p.id,
                    rank: p.rank,
                    title: p.problemStatement?.title ?? p.title ?? "Untitled proposal",
                    theme: p.problemStatement?.theme ?? p.theme ?? "",
                    category: p.problemStatement?.category ?? p.category ?? "",
                    organisation: p.problemStatement?.organisation ?? p.organisation ?? "",
                    description: p.problemStatement?.description ?? p.description ?? "",
                    sourceLabel: p.problemStatement ? `Catalog · ${p.problemStatement.code}` : "Student Proposal",
                  };
                  return (
                    <PreferenceReviewCard
                      key={p.id}
                      preference={preference}
                      teamName={team.name}
                      busy={approvingId === p.id}
                      onApprove={handleApprove}
                    />
                  );
                })}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<ClockIcon className="h-10 w-10" />}
            heading="No preferences submitted yet"
            description="This team hasn't submitted their ranked problem statement preferences for review yet."
          />
        )}
      </div>
    </MentorShell>
  );
}
