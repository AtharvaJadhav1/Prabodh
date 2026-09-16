"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthProvider";

export type MentorTeamRow = {
  pendingInvite?: boolean;
  inviteId?: string;
  team: {
    id: string;
    name: string;
    teamCode: string;
    theme?: string | null;
    memberCap?: number;
    leader?: { id: string; fullName: string; email: string } | null;
    members?: Array<{ id: string }>;
    problemStatement?: {
      id: string;
      code: string;
      title: string;
      theme: string;
      category?: string;
      organisation?: string;
      description: string;
    } | null;
    psPreferences?: Array<{
      id: string;
      rank: number;
      status: "saved" | "submitted" | "approved" | "rejected";
      problemStatement?: {
        id: string;
        code: string;
        title: string;
        theme: string;
        category: string;
        organisation: string;
        description: string;
      } | null;
      title?: string | null;
      theme?: string | null;
      category?: string | null;
      organisation?: string | null;
      description?: string | null;
    }>;
    stageResults?: Array<{ published: boolean; weightedScore: string | number }>;
  };
};

type MentorTeamsContextValue = {
  teams: MentorTeamRow[];
  loading: boolean;
  error: string | null;
  psApprovalsCount: number;
  refresh: (soft?: boolean) => Promise<void>;
};

const MentorTeamsContext = createContext<MentorTeamsContextValue | null>(null);

export function MentorTeamsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [teams, setTeams] = useState<MentorTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (soft = false) => {
      if (!session) return;
      if (!soft) setLoading(true);
      try {
        const rows = await api<MentorTeamRow[]>("/mentors/me/teams");
        setTeams(rows);
        setError(null);
      } catch (err) {
        if (!soft) {
          setTeams([]);
          setError(err instanceof Error ? err.message : "Could not load mentor teams");
        }
      } finally {
        if (!soft) setLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const psApprovalsCount = useMemo(
    () =>
      teams.filter(
        (row) =>
          !row.pendingInvite &&
          !row.team.problemStatement &&
          (row.team.psPreferences ?? []).some((p) => p.status === "submitted"),
      ).length,
    [teams],
  );

  const value = useMemo(
    () => ({ teams, loading, error, psApprovalsCount, refresh }),
    [teams, loading, error, psApprovalsCount, refresh],
  );

  return <MentorTeamsContext.Provider value={value}>{children}</MentorTeamsContext.Provider>;
}

export function useMentorTeams() {
  const ctx = useContext(MentorTeamsContext);
  if (!ctx) throw new Error("useMentorTeams must be used within MentorTeamsProvider");
  return ctx;
}
