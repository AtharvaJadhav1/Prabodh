"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { GroupRequest, GroupRequestHistoryEntry } from "../../data/mentorDashboard";
import { api, apiPatch, apiPost } from "../../lib/api";
import { avatarUrlFrom } from "../../lib/avatar";
import { useAuth } from "../auth/AuthProvider";
import { useMentorTeams } from "./MentorTeamsProvider";

type MentorInviteRow = {
  id: string;
  mentorType: string;
  inviteStatus?: string;
  createdAt: string;
  updatedAt?: string;
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
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  processingId: string | null;
  unreadCommentCount: number;
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

function mapHistory(row: MentorInviteRow): GroupRequestHistoryEntry {
  const base = mapInvite(row);
  // accepted = you took the team; revoked = you declined it (or the team withdrew it); expired = it
  // was filled/locked before you answered.
  const status: GroupRequestHistoryEntry["status"] =
    row.inviteStatus === "accepted" ? "ACCEPTED" : row.inviteStatus === "expired" ? "EXPIRED" : "DECLINED";
  return {
    teamId: base.teamId,
    groupId: base.groupId,
    teamName: base.teamName,
    leaderName: base.leaderName,
    leaderAvatarUrl: base.leaderAvatarUrl,
    memberCount: base.memberCount,
    allocatedRole: base.allocatedRole,
    status,
    receivedDate: base.allocatedAt,
    respondedDate: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—",
  };
}

export function MentorRequestProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { refresh: refreshMentorTeams } = useMentorTeams();
  const pathname = usePathname();
  const onQueriesPage = pathname?.startsWith("/dashboard/mentor/queries");
  const [pendingRequests, setPendingRequests] = useState<GroupRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<GroupRequestHistoryEntry[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [unreadCommentCount, setUnreadCommentCount] = useState(0);
  const unreadCommentIdsRef = useRef<string[]>([]);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const [pending, history] = await Promise.all([
        api<MentorInviteRow[]>("/mentors/invites?mentorType=institute"),
        // Past responses live on the server, so they survive a refresh.
        api<MentorInviteRow[]>("/mentors/invites?history=1&mentorType=institute").catch(() => null),
      ]);
      setPendingRequests(pending.map(mapInvite));
      if (history) setRequestHistory(history.map(mapHistory));
    } catch {
      // Keep what is already on screen on a transient error — don't wipe the pending list.
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshUnreadComments = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await api<Array<{ id: string; type: string; readAt: string | null }>>(
        "/notifications?unread=true",
      );
      const ids = rows.filter((n) => n.type === "comment" && !n.readAt).map((n) => n.id);
      unreadCommentIdsRef.current = ids;
      setUnreadCommentCount(ids.length);
    } catch {
      // keep the last known unread state on transient errors
    }
  }, [session]);

  useEffect(() => {
    void refreshUnreadComments();
    const timer = window.setInterval(() => void refreshUnreadComments(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadComments]);

  const markCommentNotificationsRead = useCallback(() => {
    const ids = unreadCommentIdsRef.current;
    if (!ids.length) return;
    unreadCommentIdsRef.current = [];
    setUnreadCommentCount(0);
    for (const id of ids) {
      void apiPatch(`/notifications/${id}/read`, {}).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (onQueriesPage && unreadCommentCount > 0) {
      markCommentNotificationsRead();
    }
  }, [onQueriesPage, unreadCommentCount, markCommentNotificationsRead]);

  const pendingCount = pendingRequests.length;
  const acceptedCount = useMemo(
    () => requestHistory.filter((h) => h.status === "ACCEPTED").length,
    [requestHistory],
  );

  const acceptRequest = useCallback(
    (id: string) => {
      if (processingId === id) return;
      const target = pendingRequests.find((r) => r.id === id);
      setProcessingId(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      void apiPost<{ accepted?: boolean } | null>(`/mentors/invites/${id}/accept`, {})
        .then((result) => {
          // The server expires the invite (team already has a mentor, locked, or you already hold a
          // seat on it) and answers accepted:false — that is not an acceptance.
          if (result && result.accepted === false) {
            void reload();
            void refreshMentorTeams(true);
            return;
          }
          void refreshMentorTeams(true);
          void reload();
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
      if (processingId === id) return;
      const target = pendingRequests.find((r) => r.id === id);
      setProcessingId(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      void apiPost(`/mentors/invites/${id}/decline`, {})
        .then(() => {
          void reload();
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
        acceptRequest,
        declineRequest,
        processingId,
        unreadCommentCount,
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
