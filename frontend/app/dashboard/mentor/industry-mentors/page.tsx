"use client";

import { useEffect, useMemo, useState } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import IndustryMentorMetricCards from "../../../../components/mentor/IndustryMentorMetricCards";
import IndustryMentorCard from "../../../../components/mentor/IndustryMentorCard";
import { type IndustryMentor, type MentorGroup } from "../../../../data/mentorDashboard";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../components/auth/AuthProvider";

export default function IndustryMentorsPage() {
  const { session } = useAuth();
  const [mentors, setMentors] = useState<IndustryMentor[]>([]);
  const [groups, setGroups] = useState<MentorGroup[]>([]);

  useEffect(() => {
    if (!session) return;
    void api<
      Array<{
        team: {
          id: string;
          name: string;
          teamCode: string;
          theme?: string | null;
          memberCap?: number;
          members?: unknown[];
          leader?: { fullName: string; email: string };
          problemStatement?: { code: string; title: string } | null;
          mentorAssignments?: Array<{
            mentorType: string;
            mentorUserId: string;
            mentor: { id: string; fullName: string; email: string };
          }>;
        };
      }>
    >("/mentors/me/teams")
      .then((rows) => {
        const nextGroups: MentorGroup[] = [];
        const byId = new Map<string, IndustryMentor>();
        for (const row of rows) {
          nextGroups.push({
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
          });
          for (const a of row.team.mentorAssignments ?? []) {
            if (a.mentorType !== "industry") continue;
            const existing = byId.get(a.mentorUserId);
            if (existing) {
              if (!existing.mappedTeamIds.includes(row.team.id)) existing.mappedTeamIds.push(row.team.id);
            } else {
              byId.set(a.mentorUserId, {
                id: a.mentorUserId,
                name: a.mentor.fullName,
                initials: a.mentor.fullName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase(),
                email: a.mentor.email,
                phone: "",
                company: "",
                designation: "Industry Mentor",
                expertise: [],
                mappedTeamIds: [row.team.id],
              });
            }
          }
        }
        setGroups(nextGroups);
        setMentors([...byId.values()]);
      })
      .catch(() => {
        setGroups([]);
        setMentors([]);
      });
  }, [session]);

  const mapping = useMemo(() => {
    return groups.map((g) => {
      const mentor = mentors.find((m) => m.mappedTeamIds.includes(g.id ?? ""));
      return { group: g, mentor };
    });
  }, [groups, mentors]);

  return (
    <MentorShell
      title="Industry Mentors"
      subtitle="Industry experts allocated to your teams by a nodal admin. Mapping is managed in the admin console."
    >
      <IndustryMentorMetricCards mentors={mentors} totalTeams={groups.length} />

      <section className="mb-10">
        <div className="mb-4">
          <h2 className="text-base font-bold text-brand-deep">Allocated Industry Mentors</h2>
          <p className="text-xs text-brand-muted">Live assignments from the platform, not a local directory.</p>
        </div>

        {mentors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
            <p className="text-xs font-medium text-brand-muted">
              No industry mentors are allocated to your teams yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {mentors.map((m) => (
              <IndustryMentorCard
                key={m.id}
                mentor={m}
                mappedTeamCount={m.mappedTeamIds.length}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-brand-deep">Team mapping</h2>
        {mapping.length === 0 ? (
          <p className="text-sm text-brand-muted">No assigned teams yet.</p>
        ) : (
          <ul className="divide-y divide-brand-sand">
            {mapping.map(({ group, mentor }) => (
              <li key={group.teamId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-brand-deep">
                  {group.teamName}{" "}
                  <span className="font-mono text-xs text-brand-muted">({group.teamId})</span>
                </span>
                <span className="text-brand-muted">{mentor?.name ?? "Unassigned"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MentorShell>
  );
}
