"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  mentorMaxCap,
  initialPendingRequests,
  initialRequestHistory,
  mentorProfile,
  type GroupRequest,
  type GroupRequestHistoryEntry,
} from "../../data/mentorDashboard";

type MentorRequestContextValue = {
  pendingRequests: GroupRequest[];
  requestHistory: GroupRequestHistoryEntry[];
  pendingCount: number;
  acceptedCount: number;
  atCapacity: boolean;
  domainMatchPercent: number;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
};

const MentorRequestContext = createContext<MentorRequestContextValue | null>(null);

function computeDomainMatchPercent(
  pending: GroupRequest[],
  expertiseAreas: string[],
): number {
  if (pending.length === 0) return 0;
  const expertiseText = expertiseAreas.map((a) => a.toLowerCase()).join(" ");
  let matched = 0;
  for (const req of pending) {
    const hasMatch = req.domains.some((d) => {
      const dl = d.toLowerCase();
      return (
        expertiseText.includes(dl) ||
        dl.split(/\s+/).some((w) => w.length > 2 && expertiseText.includes(w))
      );
    });
    if (hasMatch) matched++;
  }
  return Math.round((matched / pending.length) * 100);
}

export function MentorRequestProvider({ children }: { children: ReactNode }) {
  const [pendingRequests, setPendingRequests] = useState<GroupRequest[]>(initialPendingRequests);
  const [requestHistory, setRequestHistory] = useState<GroupRequestHistoryEntry[]>(initialRequestHistory);

  const pendingCount = pendingRequests.length;
  const acceptedCount = useMemo(
    () => requestHistory.filter((h) => h.status === "ACCEPTED").length,
    [requestHistory],
  );
  const atCapacity = acceptedCount >= mentorMaxCap;

  const expertiseAreas = mentorProfile.domainExpertise.map((e) => e.area);
  const domainMatchPercent = useMemo(
    () => computeDomainMatchPercent(pendingRequests, expertiseAreas),
    [pendingRequests, expertiseAreas],
  );

  const acceptRequest = useCallback(
    (id: string) => {
      const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
      setPendingRequests((prev) => {
        const target = prev.find((r) => r.id === id);
        if (!target) return prev;
        setRequestHistory((h) => [
          {
            groupId: target.groupId,
            teamName: target.teamName,
            leaderName: target.leaderName,
            memberCount: target.memberCount,
            allocatedRole: target.allocatedRole,
            status: "ACCEPTED",
            receivedDate: target.allocatedAt,
            respondedDate: dateStr,
          },
          ...h,
        ]);
        return prev.filter((r) => r.id !== id);
      });
    },
    [],
  );

  const declineRequest = useCallback(
    (id: string) => {
      const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
      setPendingRequests((prev) => {
        const target = prev.find((r) => r.id === id);
        if (!target) return prev;
        setRequestHistory((h) => [
          {
            groupId: target.groupId,
            teamName: target.teamName,
            leaderName: target.leaderName,
            memberCount: target.memberCount,
            allocatedRole: target.allocatedRole,
            status: "DECLINED",
            receivedDate: target.allocatedAt,
            respondedDate: dateStr,
          },
          ...h,
        ]);
        return prev.filter((r) => r.id !== id);
      });
    },
    [],
  );

  return (
    <MentorRequestContext.Provider
      value={{
        pendingRequests,
        requestHistory,
        pendingCount,
        acceptedCount,
        atCapacity,
        domainMatchPercent,
        acceptRequest,
        declineRequest,
      }}
    >
      {children}
    </MentorRequestContext.Provider>
  );
}

export function useMentorRequests() {
  const ctx = useContext(MentorRequestContext);
  if (!ctx) throw new Error("useMentorRequests must be used within MentorRequestProvider");
  return ctx;
}
