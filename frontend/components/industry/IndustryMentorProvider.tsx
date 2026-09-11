"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  initialInviteHistory,
  mentorsForGroup,
  type MentorInvite,
} from "../../data/industryDashboard";
import { type MentorGroup } from "../../data/mentorDashboard";
import { api } from "../../lib/api";
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

export function IndustryMentorProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<MentorInvite[]>([]);
  const [inviteHistory, setInviteHistory] = useState<MentorInvite[]>(initialInviteHistory);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [visibleTeams, setVisibleTeams] = useState<MentorGroup[]>([]);
  const [acceptedMentors, setAcceptedMentors] = useState<AcceptedMentor[]>([]);

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
          mentorAssignments?: Array<{ mentorType: string; mentor: { id: string; fullName: string; email: string } }>;
        };
      }>
    >("/mentors/me/teams")
      .then((rows) => {
        const mentors: AcceptedMentor[] = [];
        setVisibleTeams(
          rows.map((row) => {
            for (const a of row.team.mentorAssignments ?? []) {
              if (a.mentorType !== "institute") continue;
              if (!mentors.some((m) => m.instituteMentorId === a.mentor.id)) {
                mentors.push({
                  instituteMentorId: a.mentor.id,
                  instituteMentorName: a.mentor.fullName,
                  instituteMentorInitials: initials(a.mentor.fullName),
                  instituteMentorTitle: a.mentor.email,
                  groupIds: [row.team.teamCode],
                });
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
        setAcceptedMentors(mentors);
        setPendingInvites([]);
      })
      .catch(() => {
        setVisibleTeams([]);
        setPendingInvites([]);
        setAcceptedMentors([]);
      });
  }, [session]);

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
    (id: string) => {
      const target = pendingInvites.find((inv) => inv.id === id);
      if (!target) return;
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      setInviteHistory((h) => [
        ...h.filter((inv) => inv.id !== target.id),
        { ...target, status: "accepted", respondedAt: formatDate() },
      ]);
    },
    [pendingInvites],
  );

  const declineInvite = useCallback(
    (id: string) => {
      const target = pendingInvites.find((inv) => inv.id === id);
      if (!target) return;
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
      setInviteHistory((h) => [
        ...h.filter((inv) => inv.id !== target.id),
        { ...target, status: "declined", respondedAt: formatDate() },
      ]);
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
