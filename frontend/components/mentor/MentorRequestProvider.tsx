"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mentorMaxCap, type GroupRequest, type GroupRequestHistoryEntry } from "../../data/mentorDashboard";
import { api, apiPost } from "../../lib/api";
import { avatarUrlFrom } from "../../lib/avatar";
import { useAuth } from "../auth/AuthProvider";
import { useMentorTeams } from "./MentorTeamsProvider";

type MentorInviteRow = {
  id: string;
  mentorType: string;
  createdAt: string;
  team: {
    id: string;
    teamCode: string;
    name: string;
    theme?: string | null;
    leader?: { fullName: string; profileJson?: Record<string, unknown> };
    members?: unknown[];
  };
};

type MentorRequestContextValue = {
  pendingRequests: GroupRequest[];
  requestHistory: GroupRequestHistoryEntry[];
  pendingCount: number;
  acceptedCount: number;
  atCapacity: boolean;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  processingId: string | null;
};

const MentorRequestContext = createContext<MentorRequestContextValue | null>(null);

function mapInvite(row: MentorInviteRow): GroupRequest {
  return {
    id: row.id,
    teamId: row.team.id,
    groupId: row.team.teamCode,
    teamName: row.team.name,
    leaderName: row.team.leader?.fullName ?? "Team lead",
    leaderAvatarUrl: avatarUrlFrom(row.team.leader?.profileJson) ?? null,
    memberCount: row.team.members?.length ?? 0,
    allocatedRole: "Institute Mentor",
    allocatedAt: new Date(row.createdAt).toLocaleDateString(),
    domains: [row.team.theme ?? "Unassigned"].filter(Boolean) as string[],
  };
}

export function MentorRequestProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { refresh: refreshMentorTeams } = useMentorTeams();
  const [pendingRequests, setPendingRequests] = useState<GroupRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<GroupRequestHistoryEntry[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const acceptRequest = useCallback(
    (id: string) => {
      if (processingId) return;
      const target = pendingRequests.find((r) => r.id === id);
      setProcessingId(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      void apiPost(`/mentors/invites/${id}/accept`, {})
        .then(() => {
          void refreshMentorTeams(true);
          if (target) {
            setRequestHistory((h) => [
              {
                teamId: target.teamId,
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
        })
        .catch(() => {
          if (target) {
            setPendingRequests((prev) => (prev.some((r) => r.id === id) ? prev : [target, ...prev]));
          }
          void reload();
        })
        .finally(() => {
          setProcessingId((current) => (current === id ? null : current));
        });
    },
    [pendingRequests, processingId, reload, refreshMentorTeams],
  );

  const declineRequest = useCallback(
    (id: string) => {
      if (processingId) return;
      const target = pendingRequests.find((r) => r.id === id);
      setProcessingId(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      void apiPost(`/mentors/invites/${id}/decline`, {})
        .then(() => {
          if (target) {
            setRequestHistory((h) => [
              {
                teamId: target.teamId,
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
        })
        .catch(() => {
          if (target) {
            setPendingRequests((prev) => (prev.some((r) => r.id === id) ? prev : [target, ...prev]));
          }
          void reload();
        })
        .finally(() => {
          setProcessingId((current) => (current === id ? null : current));
        });
    },
    [pendingRequests, processingId, reload],
  );

  return (
    <MentorRequestContext.Provider
      value={{
        pendingRequests,
        requestHistory,
        pendingCount,
        acceptedCount,
        atCapacity,
        acceptRequest,
        declineRequest,
        processingId,
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
