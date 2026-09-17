"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mentorsForGroup, type MentorInvite } from "../../data/industryDashboard";
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
  teamMentors: (teamId: string) => MentorInvite[];
  acceptInvite: (id: string) => void;
  declineInvite: (id: string) => void;
};

const IndustryMentorContext = createContext<IndustryMentorContextValue | null>(null);

function formatDate(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
}

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
  return {
    id: row.id,
    instituteMentorId: row.id,
    instituteMentorName: team.name,
    instituteMentorInitials: initials(team.name),
    instituteMentorTitle: team.leader?.fullName ?? team.teamCode,
    status: "pending",
    invitedAt: new Date(row.createdAt).toLocaleDateString(),
    respondedAt: null,
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
      const rows = await api<TeamApiRow[]>("/mentors/me/teams");
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
      setVisibleTeams([]);
      setAcceptedMentors([]);
    }
  }, [session]);

  const loadInvites = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await api<InviteApiRow[]>("/mentors/invites");
      setPendingInvites(rows.filter((row) => row.inviteStatus === "pending").map(toInvite));
    } catch {
      setPendingInvites([]);
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
    (teamId: string) => mentorsForGroup(acceptedInvites, teamId),
    [acceptedInvites],
  );

  const acceptInvite = useCallback(
    async (id: string) => {
      const target = pendingInvites.find((inv) => inv.id === id);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      if (target) {
        setInviteHistory((h) => [
          ...h.filter((inv) => inv.id !== target.id),
          { ...target, status: "accepted", respondedAt: formatDate() },
        ]);
      }
      try {
        await apiPost(`/mentors/invites/${id}/accept`, {});
        void loadTeams();
      } catch {
        if (target) {
          setPendingInvites((prev) => (prev.some((inv) => inv.id === id) ? prev : [target, ...prev]));
          setInviteHistory((h) => h.filter((inv) => inv.id !== target.id || inv.status !== "accepted"));
        }
      }
    },
    [pendingInvites, loadTeams],
  );

  const declineInvite = useCallback(
    async (id: string) => {
      const target = pendingInvites.find((inv) => inv.id === id);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      if (target) {
        setInviteHistory((h) => [
          ...h.filter((inv) => inv.id !== target.id),
          { ...target, status: "revoked", respondedAt: formatDate() },
        ]);
      }
      try {
        await apiPost(`/mentors/invites/${id}/decline`, {});
      } catch {
        if (target) {
          setPendingInvites((prev) => (prev.some((inv) => inv.id === id) ? prev : [target, ...prev]));
          setInviteHistory((h) => h.filter((inv) => !(inv.id === target.id && inv.status === "revoked")));
        }
      }
    },
    [pendingInvites],
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