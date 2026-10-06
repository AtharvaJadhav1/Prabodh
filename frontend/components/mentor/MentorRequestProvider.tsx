"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GroupRequest, GroupRequestHistoryEntry } from "../../data/mentorDashboard";
import { api, apiPatch, apiPost } from "../../lib/api";
import { useAppRefresh } from "../../lib/app-refresh";
import { avatarUrlFrom } from "../../lib/avatar";
import { isAlreadyAnswered } from "../../lib/invite-errors";
import { useAuth } from "../auth/AuthProvider";
import { useMentorTeams } from "./MentorTeamsProvider";

type MentorInviteRow = {
  id: string;
  mentorType: string;
  inviteStatus?: string;
  unassigned?: boolean;
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
  /** Unread comment notifications per team id. */
  unreadByTeam: Record<string, number>;
  /** Mark only this team's comment notifications as read (call when its thread is open). */
  markTeamCommentsRead: (teamId: string) => void;
  /** Last accept/decline failure, shown on the Group Requests page. */
  requestError: string | null;
  clearRequestError: () => void;
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
    row.inviteStatus === "accepted"
      ? row.unassigned
        ? "UNASSIGNED"
        : "ACCEPTED"
      : row.inviteStatus === "expired"
        ? "EXPIRED"
        : "DECLINED";
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
  const [pendingRequests, setPendingRequests] = useState<GroupRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<GroupRequestHistoryEntry[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [unreadByTeam, setUnreadByTeam] = useState<Record<string, number>>({});
  // notification ids per team, so opening one team marks only that team's messages as read
  const unreadIdsByTeamRef = useRef<Record<string, string[]>>({});

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

  // The notification panel answered a mentor invite: reload requests and the mentor's teams.
  useAppRefresh(["mentor"], () => {
    void reload();
    void refreshMentorTeams(true);
  });

  const refreshUnreadComments = useCallback(async () => {
    if (!session) return;
    try {
      const rows = await api<Array<{ id: string; type: string; readAt: string | null; relatedEntity?: string | null }>>(
        "/notifications?unread=true",
      );
      const byTeam: Record<string, string[]> = {};
      for (const n of rows) {
        if (n.type !== "comment" || n.readAt) continue;
        const teamId = n.relatedEntity?.startsWith("team:") ? n.relatedEntity.slice(5) : "unknown";
        (byTeam[teamId] ??= []).push(n.id);
      }
      unreadIdsByTeamRef.current = byTeam;
      setUnreadByTeam(Object.fromEntries(Object.entries(byTeam).map(([t, ids]) => [t, ids.length])));
    } catch {
      // keep the last known unread state on transient errors
    }
  }, [session]);

  useEffect(() => {
    void refreshUnreadComments();
    const timer = window.setInterval(() => void refreshUnreadComments(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadComments]);

  const unreadCommentCount = useMemo(
    () => Object.values(unreadByTeam).reduce((n, c) => n + c, 0),
    [unreadByTeam],
  );

  const markTeamCommentsRead = useCallback((teamId: string) => {
    const ids = unreadIdsByTeamRef.current[teamId];
    if (!ids?.length) return;
    delete unreadIdsByTeamRef.current[teamId];
    setUnreadByTeam((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
    for (const id of ids) {
      void apiPatch(`/notifications/${id}/read`, {}).catch(() => undefined);
    }
  }, []);

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
      setRequestError(null);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      void apiPost<{ accepted?: boolean } | null>(`/mentors/invites/${id}/accept`, {})
        .then((result) => {
          // The server expires the invite (team already has a mentor, locked, or you already hold a
          // seat on it) and answers accepted:false — that is not an acceptance.
          if (result && result.accepted === false) {
            setRequestError(
              `That invitation could not be accepted — the team already has a faculty mentor, is locked, or the invitation expired.`,
            );
            void reload();
            void refreshMentorTeams(true);
            return;
          }
          void refreshMentorTeams(true);
          void reload();
        })
        .catch((err: unknown) => {
          if (isAlreadyAnswered(err)) {
            // Already answered elsewhere: no scary error, just refresh so the stale card disappears.
            void reload();
            void refreshMentorTeams(true);
            return;
          }
          setRequestError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
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
      setRequestError(null);
      void apiPost(`/mentors/invites/${id}/decline`, {})
        .then(() => {
          void reload();
        })
        .catch((err: unknown) => {
          if (isAlreadyAnswered(err)) {
            // Already answered elsewhere: no scary error, just refresh so the stale card disappears.
            void reload();
            void refreshMentorTeams(true);
            return;
          }
          setRequestError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
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
        unreadByTeam,
        markTeamCommentsRead,
        requestError,
        clearRequestError: () => setRequestError(null),
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
