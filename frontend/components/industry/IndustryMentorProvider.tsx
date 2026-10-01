"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { InviteStatus, MentorInvite } from "../../data/industryDashboard";
import { type MentorGroup } from "../../data/mentorDashboard";
import { api, apiPost } from "../../lib/api";
import { useAuth } from "../auth/AuthProvider";

export type AcceptedMentor = {
  instituteMentorId: string;
  instituteMentorName: string;
  instituteMentorInitials: string;
  instituteMentorTitle: string;
  groupIds: string[];
};

type IndustryMentorContextValue = {
  pendingInvites: MentorInvite[];
  inviteHistory: MentorInvite[];
  acceptedInvites: MentorInvite[];
  acceptedMentors: AcceptedMentor[];
  pendingCount: number;
  selectedMentorIds: string[];
  toggleMentorSelection: (instituteMentorId: string) => void;
  visibleTeams: MentorGroup[];
  /** Every assigned team, ignoring the mentor filter. */
  allTeams: MentorGroup[];
  teamMentors: (teamCode: string) => AcceptedMentor[];
  acceptInvite: (id: string) => Promise<void>;
  declineInvite: (id: string) => Promise<void>;
};

const IndustryMentorContext = createContext<IndustryMentorContextValue | null>(null);

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type TeamApiRow = {
  team: {
    id: string;
    name: string;
    teamCode: string;
    theme?: string | null;
    leader?: { fullName: string; email: string } | null;
    problemStatement?: { code: string; title: string } | null;
    members?: unknown[];
    memberCap?: number;
    mentorAssignments?: Array<{ mentorType: string; mentor: { id: string; fullName: string; email: string } }>;
  };
  pendingInvite?: boolean;
};

type InviteApiRow = {
  id: string;
  teamId: string;
  invitedEmail: string;
  mentorUserId: string | null;
  mentorType: string;
  inviteStatus: string;
  invitedById: string;
  createdAt: string;
  updatedAt?: string;
  invitedBy?: { id: string; fullName: string; email: string } | null;
  team: {
    id: string;
    name: string;
    teamCode: string;
    leader?: { fullName: string; email: string } | null;
    problemStatement?: { code: string; title: string } | null;
  };
};

function toInvite(row: InviteApiRow): MentorInvite {
  const team = row.team;
  const status: InviteStatus =
    row.inviteStatus === "accepted" || row.inviteStatus === "revoked" || row.inviteStatus === "expired"
      ? row.inviteStatus
      : "pending";
  return {
    id: row.id,
    instituteMentorId: row.id,
    instituteMentorName: team.name,
    instituteMentorInitials: initials(team.name),
    instituteMentorTitle: row.invitedBy?.fullName
      ? `Invited by ${row.invitedBy.fullName}`
      : team.leader?.fullName ?? team.teamCode,
    status,
    invitedAt: new Date(row.createdAt).toLocaleDateString(),
    respondedAt: status === "pending" || !row.updatedAt ? null : new Date(row.updatedAt).toLocaleDateString(),
    groupIds: [team.teamCode ?? team.id],
  };
}

export function IndustryMentorProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<MentorInvite[]>([]);
  const [inviteHistory, setInviteHistory] = useState<MentorInvite[]>([]);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [visibleTeams, setVisibleTeams] = useState<MentorGroup[]>([]);
  const [acceptedMentors, setAcceptedMentors] = useState<AcceptedMentor[]>([]);

  const loadTeams = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await api<TeamApiRow[]>("/mentors/me/teams?mentorType=industry");
      const mentorsById = new Map<string, AcceptedMentor>();
      setVisibleTeams(
        rows
          .filter((row) => !row.pendingInvite)
          .map((row) => {
            for (const a of row.team.mentorAssignments ?? []) {
              if (a.mentorType !== "institute") continue;
              let m = mentorsById.get(a.mentor.id);
              if (!m) {
                m = {
                  instituteMentorId: a.mentor.id,
                  instituteMentorName: a.mentor.fullName,
                  instituteMentorInitials: initials(a.mentor.fullName),
                  instituteMentorTitle: a.mentor.email,
                  groupIds: [],
                };
                mentorsById.set(a.mentor.id, m);
              }
              if (!m.groupIds.includes(row.team.teamCode)) {
                m.groupIds.push(row.team.teamCode);
              }
            }
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
            };
          }),
      );
      setAcceptedMentors([...mentorsById.values()]);
    } catch {
      /* keep the last known teams on transient errors */
    }
  }, [session]);

  const loadInvites = useCallback(async () => {
    if (!session) return;
    try {
      const [pending, history] = await Promise.all([
        api<InviteApiRow[]>("/mentors/invites?mentorType=industry"),
        api<InviteApiRow[]>("/mentors/invites?history=1&mentorType=industry").catch(() => [] as InviteApiRow[]),
      ]);
      setPendingInvites(pending.filter((row) => row.inviteStatus === "pending").map(toInvite));
      setInviteHistory(history.map(toInvite));
    } catch {
      /* keep the last known lists on transient errors */
    }
  }, [session]);

  useEffect(() => {
    void loadTeams();
    void loadInvites();
  }, [loadTeams, loadInvites]);

  const pendingCount = pendingInvites.length;

  const acceptedInvites = useMemo(
    () => inviteHistory.filter((inv) => inv.status === "accepted"),
    [inviteHistory],
  );

  const toggleMentorSelection = useCallback((instituteMentorId: string) => {
    setSelectedMentorIds((prev) =>
      prev.includes(instituteMentorId)
        ? prev.filter((id) => id !== instituteMentorId)
        : [...prev, instituteMentorId],
    );
  }, []);

  const filteredTeams = useMemo(() => {
    if (selectedMentorIds.length === 0) return visibleTeams;
    const codes = new Set(
      acceptedMentors.filter((m) => selectedMentorIds.includes(m.instituteMentorId)).flatMap((m) => m.groupIds),
    );
    return visibleTeams.filter((t) => codes.has(t.teamId));
  }, [visibleTeams, selectedMentorIds, acceptedMentors]);

  const teamMentors = useCallback(
    (teamCode: string) => acceptedMentors.filter((m) => m.groupIds.includes(teamCode)),
    [acceptedMentors],
  );

  const acceptInvite = useCallback(
    async (id: string) => {
      const result = await apiPost<{ accepted?: boolean }>(`/mentors/invites/${id}/accept`, {});
      await Promise.all([loadInvites(), loadTeams()]);
      if (result && result.accepted === false) {
        throw new Error("This team already has an industry mentor (or the invitation expired), so it could not be accepted.");
      }
    },
    [loadTeams, loadInvites],
  );

  const declineInvite = useCallback(
    async (id: string) => {
      await apiPost(`/mentors/invites/${id}/decline`, {});
      await loadInvites();
    },
    [loadInvites],
  );

  return (
    <IndustryMentorContext.Provider
      value={{
        pendingInvites,
        inviteHistory,
        acceptedInvites,
        acceptedMentors,
        pendingCount,
        selectedMentorIds,
        toggleMentorSelection,
        visibleTeams: filteredTeams,
        allTeams: visibleTeams,
        teamMentors,
        acceptInvite,
        declineInvite,
      }}
    >
      {children}
    </IndustryMentorContext.Provider>
  );
}

export function useIndustryMentor() {
  const ctx = useContext(IndustryMentorContext);
  if (!ctx) throw new Error("useIndustryMentor must be used within IndustryMentorProvider");
  return ctx;
}