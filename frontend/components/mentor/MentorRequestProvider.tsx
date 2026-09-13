"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  mentorMaxCap,
  mentorProfile,
  type GroupRequest,
  type GroupRequestHistoryEntry,
} from "../../data/mentorDashboard";
import { api, apiPost } from "../../lib/api";
import { avatarUrlFrom } from "../../lib/avatar";
import { useAuth } from "../auth/AuthProvider";

type MentorInviteRow = {
  id: string;
  mentorType: string;
  createdAt: string;
  team: {
    teamCode: string;
    name: string;
    theme?: string | null;
    leader?: { fullName: string; profileJson?: Record<string, unknown> };
    members?: unknown[];
    problemStatement?: { theme?: string; title?: string } | null;
  };
};

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

function computeDomainMatchPercent(pending: GroupRequest[], expertiseAreas: string[]): number {
  if (pending.length === 0) return 0;
  const expertiseText = expertiseAreas.map((a) => a.toLowerCase()).join(" ");
  let matched = 0;
  for (const req of pending) {
    const hasMatch = req.domains.some((d) => {
      const dl = d.toLowerCase();
      return expertiseText.includes(dl) || dl.split(/\s+/).some((w) => w.length > 2 && expertiseText.includes(w));
    });
    if (hasMatch) matched++;
  }
  return Math.round((matched / pending.length) * 100);
}

function mapInvite(row: MentorInviteRow): GroupRequest {
  return {
    id: row.id,
    groupId: row.team.teamCode,
    teamName: row.team.name,
    leaderName: row.team.leader?.fullName ?? "Team lead",
    leaderAvatarUrl: avatarUrlFrom(row.team.leader?.profileJson) ?? null,
    memberCount: row.team.members?.length ?? 0,
    allocatedRole: "Institute Mentor",
    allocatedAt: new Date(row.createdAt).toLocaleDateString(),
    domains: [row.team.problemStatement?.theme ?? row.team.theme ?? "Unassigned"].filter(Boolean) as string[],
  };
}

export function MentorRequestProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<GroupRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<GroupRequestHistoryEntry[]>([]);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await api<MentorInviteRow[]>("/mentors/invites");
      setPendingRequests(rows.map(mapInvite));
    } catch {
      setPendingRequests([]);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      const target = pendingRequests.find((r) => r.id === id);
      void apiPost(`/mentors/invites/${id}/accept`, {})
        .then(() => {
          if (target) {
            setRequestHistory((h) => [
              {
                groupId: target.groupId,
                teamName: target.teamName,
                leaderName: target.leaderName,
                leaderAvatarUrl: target.leaderAvatarUrl,
                memberCount: target.memberCount,
                allocatedRole: target.allocatedRole,
                status: "ACCEPTED",
                receivedDate: target.allocatedAt,
                respondedDate: new Date().toLocaleDateString(),
              },
              ...h,
            ]);
          }
          setPendingRequests((prev) => prev.filter((r) => r.id !== id));
        })
        .catch(() => {
          void reload();
        });
    },
    [pendingRequests, reload],
  );

  const declineRequest = useCallback(
    (id: string) => {
      const target = pendingRequests.find((r) => r.id === id);
      void apiPost(`/mentors/invites/${id}/decline`, {})
        .then(() => {
          if (target) {
            setRequestHistory((h) => [
              {
                groupId: target.groupId,
                teamName: target.teamName,
                leaderName: target.leaderName,
                leaderAvatarUrl: target.leaderAvatarUrl,
                memberCount: target.memberCount,
                allocatedRole: target.allocatedRole,
                status: "DECLINED",
                receivedDate: target.allocatedAt,
                respondedDate: new Date().toLocaleDateString(),
              },
              ...h,
            ]);
          }
          setPendingRequests((prev) => prev.filter((r) => r.id !== id));
        })
        .catch(() => {
          void reload();
        });
    },
    [pendingRequests, reload],
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
