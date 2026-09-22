"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../../../../components/admin/AdminShell";
import StatusPill from "../../../../../components/admin/StatusPill";
import Avatar from "../../../../../components/Avatar";
import { api, apiPost, ApiError } from "../../../../../lib/api";
import type { PortalTeam, TeamMentors } from "../../../../../lib/types";
import {
  FileTextIcon,
  PresentationIcon,
  GithubIcon,
  ExternalLinkIcon,
  LockIcon,
  AlertTriangleIcon,
} from "../../../../../components/dashboard/icons";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

function SkeletonCard({ heightClass = "h-40" }: { heightClass?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-neutral-200/80 bg-neutral-100 ${heightClass}`} />;
}

function InviteStatusBadge({ status }: { status: string }) {
  const className =
    status === "accepted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "declined"
        ? "border-red-200 bg-red-50 text-red-600"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${className}`}>
      {status}
    </span>
  );
}

function DeliverableLink({ label, url, icon }: { label: string; url?: string | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-neutral-600">
        {icon}
        {label}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-semibold text-brand-primary hover:underline"
        >
          View <ExternalLinkIcon className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-neutral-400">Not submitted</span>
      )}
    </div>
  );
}

export default function AdminTeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const [team, setTeam] = useState<PortalTeam | null>(null);
  const [mentors, setMentors] = useState<TeamMentors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lockPending, setLockPending] = useState(false);
  const [disqualifyPending, setDisqualifyPending] = useState(false);
  const [confirmingDisqualify, setConfirmingDisqualify] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api<PortalTeam>(`/teams/${teamId}?view=full`),
      api<TeamMentors>(`/teams/${teamId}/mentors`),
    ])
      .then(([teamRes, mentorsRes]) => {
        setTeam(teamRes);
        setMentors(mentorsRes);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load team details.");
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLock = async () => {
    if (!teamId) return;
    setActionError(null);
    setLockPending(true);
    try {
      await apiPost(`/teams/${teamId}/lock`, {});
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not lock this team.");
    } finally {
      setLockPending(false);
    }
  };

  const handleDisqualify = async () => {
    if (!teamId) return;
    setActionError(null);
    setDisqualifyPending(true);
    try {
      await apiPost(`/teams/${teamId}/disqualify`, {});
      setConfirmingDisqualify(false);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not disqualify this team.");
    } finally {
      setDisqualifyPending(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Team Details">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          <SkeletonCard heightClass="h-24" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="flex flex-col gap-6">
              <SkeletonCard />
              <SkeletonCard heightClass="h-32" />
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !team) {
    return (
      <AdminShell title="Team Details">
        <div className="mx-auto max-w-6xl">
          <Link href="/dashboard/admin/teams" className="text-sm font-medium text-brand-muted hover:text-brand-primary">
            ← Back to Teams
          </Link>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">
            <span>{error ?? "Team not found."}</span>
            <button
              type="button"
              onClick={load}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminShell>
    );
  }

  const status = team.status as "forming" | "active" | "locked" | "disqualified";
  const faculty = mentors?.faculty ?? null;
  const industrial = mentors?.industrial ?? null;
  const pendingInvite = mentors?.pendingIndustryInvite ?? null;
  const deliverables = (team.deliverables ?? []).slice().sort((a, b) => b.version - a.version);

  return (
    <AdminShell title="Team Details">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Link href="/dashboard/admin/teams" className="text-sm font-medium text-brand-muted hover:text-brand-primary">
          ← Back to Teams
        </Link>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">
            {actionError}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{team.name}</h1>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-xs font-semibold text-neutral-600">
                #{team.teamCode}
              </span>
              <StatusPill status={status} />
            </div>
            <div className="mt-1 text-xs font-medium text-neutral-500">
              {team.institute}
              {team.theme ? ` · ${team.theme}` : ""}
              {team.problemStatement ? ` · ${team.problemStatement.code} — ${team.problemStatement.title}` : ""}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card title={`Members (${team.members.length}/${team.memberCap})`}>
              <div className="flex flex-col divide-y divide-neutral-100">
                {team.members.length === 0 ? (
                  <p className="py-2 text-sm text-neutral-500">No members found for this team.</p>
                ) : (
                  team.members.map((m) => {
                    const name = m.user?.fullName ?? m.invitedEmail;
                    const email = m.user?.email ?? m.invitedEmail;
                    const isLeader = !!m.user?.id && m.user.id === team.leaderUserId;
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <Avatar src={null} seed={name} className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-neutral-900">{name}</span>
                            {isLeader && (
                              <span className="shrink-0 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
                                Leader
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-neutral-500">
                            {m.user?.department ? `${m.user.department} · ` : ""}
                            {email}
                          </div>
                        </div>
                        <InviteStatusBadge status={m.inviteStatus} />
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card title="Problem Statement">
              {team.problemStatement ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-brand-primary">
                      {team.problemStatement.code}
                    </span>
                    <span className="text-sm font-bold text-neutral-900">{team.problemStatement.title}</span>
                  </div>
                  <div className="text-xs font-medium text-neutral-500">
                    {team.problemStatement.organisation} · {team.problemStatement.theme} ·{" "}
                    {team.problemStatement.category}
                  </div>
                  <p className="text-sm text-neutral-700">{team.problemStatement.description}</p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No Problem Statement selected yet</p>
              )}
            </Card>

            <Card title="Deliverables">
              {deliverables.length === 0 ? (
                <p className="text-sm text-neutral-500">No deliverables submitted yet</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {deliverables.map((d) => (
                    <div key={d.id} className="rounded-xl border border-neutral-100 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-500">
                        <span>Version {d.version}</span>
                        <span className="flex items-center gap-2">
                          {d.locked && (
                            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                              Locked
                            </span>
                          )}
                          {new Date(d.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <DeliverableLink label="Presentation" url={d.pptUrl} icon={<PresentationIcon className="h-3.5 w-3.5" />} />
                      <DeliverableLink label="Report" url={d.reportUrl} icon={<FileTextIcon className="h-3.5 w-3.5" />} />
                      <DeliverableLink label="Video" url={d.videoUrl} icon={<ExternalLinkIcon className="h-3.5 w-3.5" />} />
                      <DeliverableLink label="GitHub" url={d.githubUrl} icon={<GithubIcon className="h-3.5 w-3.5" />} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card title="Assigned Mentors">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Institute / Faculty Mentor
                  </h3>
                  {faculty ? (
                    <div className="flex items-center gap-3">
                      <Avatar src={null} seed={faculty.name} className="h-9 w-9" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-900">{faculty.name}</div>
                        <div className="truncate text-xs text-neutral-500">
                          {faculty.department ? `${faculty.department} · ` : ""}
                          {faculty.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">No Institute Mentor assigned</p>
                  )}
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Industrial Mentor
                  </h3>
                  {industrial ? (
                    <div className="flex items-center gap-3">
                      <Avatar src={null} seed={industrial.name} className="h-9 w-9" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-900">{industrial.name}</div>
                        <div className="truncate text-xs text-neutral-500">
                          {industrial.companyName ?? ""}
                          {industrial.designation ? ` · ${industrial.designation}` : ""}
                        </div>
                        <div className="truncate text-xs text-neutral-500">{industrial.email}</div>
                      </div>
                    </div>
                  ) : pendingInvite ? (
                    <p className="text-sm text-amber-700">
                      Invite pending → {pendingInvite.invitedEmail}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500">No Industrial Mentor assigned</p>
                  )}
                </div>

                <Link
                  href="/dashboard/admin/mentor-allocation"
                  className="mt-1 text-sm font-semibold text-brand-primary hover:underline"
                >
                  Reassign Mentors →
                </Link>
              </div>
            </Card>

            <Card title="Team Actions">
              <div className="flex flex-col gap-3">
                {status !== "locked" && status !== "disqualified" && (
                  <button
                    type="button"
                    onClick={handleLock}
                    disabled={lockPending}
                    className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <LockIcon className="h-4 w-4" />
                    {lockPending ? "Locking…" : "Lock Team"}
                  </button>
                )}

                {status !== "disqualified" && !confirmingDisqualify && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDisqualify(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <AlertTriangleIcon className="h-4 w-4" />
                    Disqualify Team
                  </button>
                )}

                {confirmingDisqualify && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-700">
                      Are you sure you want to disqualify this team? This cannot be undone.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingDisqualify(false)}
                        disabled={disqualifyPending}
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDisqualify}
                        disabled={disqualifyPending}
                        className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {disqualifyPending ? "Disqualifying…" : "Confirm Disqualify"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
