"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  initialPendingInvites,
  initialInviteHistory,
  resolveGroupsForInvites,
  mentorsForGroup,
  type MentorInvite,
} from "../../data/industryDashboard";
import { type MentorGroup } from "../../data/mentorDashboard";

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

export function IndustryMentorProvider({ children }: { children: ReactNode }) {
  const [pendingInvites, setPendingInvites] = useState<MentorInvite[]>(initialPendingInvites);
  const [inviteHistory, setInviteHistory] = useState<MentorInvite[]>(initialInviteHistory);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);

  const pendingCount = pendingInvites.length;

  const acceptedInvites = useMemo(
    () => inviteHistory.filter((inv) => inv.status === "accepted"),
    [inviteHistory],
  );

  const acceptedMentors = useMemo<AcceptedMentor[]>(() => {
    const map = new Map<string, AcceptedMentor>();
    for (const inv of acceptedInvites) {
      const existing = map.get(inv.instituteMentorId);
      if (existing) {
        existing.groupIds = Array.from(new Set([...existing.groupIds, ...inv.groupIds]));
      } else {
        map.set(inv.instituteMentorId, {
          instituteMentorId: inv.instituteMentorId,
          instituteMentorName: inv.instituteMentorName,
          instituteMentorInitials: inv.instituteMentorInitials,
          instituteMentorTitle: inv.instituteMentorTitle,
          groupIds: [...inv.groupIds],
        });
      }
    }
    return Array.from(map.values());
  }, [acceptedInvites]);

  const toggleMentorSelection = useCallback((instituteMentorId: string) => {
    setSelectedMentorIds((prev) =>
      prev.includes(instituteMentorId)
        ? prev.filter((id) => id !== instituteMentorId)
        : [...prev, instituteMentorId],
    );
  }, []);

  const visibleTeams = useMemo(() => {
    const relevantInvites =
      selectedMentorIds.length > 0
        ? acceptedInvites.filter((inv) => selectedMentorIds.includes(inv.instituteMentorId))
        : acceptedInvites;
    return resolveGroupsForInvites(relevantInvites);
  }, [acceptedInvites, selectedMentorIds]);

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
        visibleTeams,
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
