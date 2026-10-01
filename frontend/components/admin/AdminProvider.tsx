"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { platformMetrics, type AdminAllocation } from "../../data/adminDashboard";
import { api, apiPost } from "../../lib/api";
import { holdsRole } from "../../lib/session";
import { useAuth } from "../auth/AuthProvider";
import type { PortalUser } from "../../lib/types";

export type LiveMentor = { id: string; name: string; title: string };

export type StageFunnel = {
  id: string;
  name: string;
  sequence: number;
  deliverables: number;
  tracked: number;
};

export type OverviewDashboard = {
  teamsByStatus: Array<{ status: string; count: number }>;
  ideaSubmissions: Array<{ status: string; count: number }>;
  activeMentorAssignments: number;
  stageFunnel: StageFunnel[];
  recentTeams: Array<{ id: string; name: string; teamCode: string; track: string; status: string; createdAt: string }>;
};

type AdminContextValue = {
  allocations: AdminAllocation[];
  assignTeam: (teamId: string, mentorId: string) => void;
  assignIndustryMentor: (teamId: string, mentorId: string) => void;
  /** Last allocation failure, shown above the table. */
  allocationError: string | null;
  clearAllocationError: () => void;
  /** Teams with an allocation change in flight (their dropdowns are locked). */
  pendingTeams: Set<string>;
  metrics: ReturnType<typeof platformMetrics>;
  overview: OverviewDashboard;
  mentors: LiveMentor[];
  industryMentorOptions: LiveMentor[];
  users: PortalUser[];
  reload: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [allocations, setAllocations] = useState<AdminAllocation[]>([]);
  const [mentors, setMentors] = useState<LiveMentor[]>([]);
  const [industryMentorOptions, setIndustryMentorOptions] = useState<LiveMentor[]>([]);
  const [metricsLive, setMetricsLive] = useState<ReturnType<typeof platformMetrics> | null>(null);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [overview, setOverview] = useState<OverviewDashboard>({
    teamsByStatus: [],
    ideaSubmissions: [],
    activeMentorAssignments: 0,
    stageFunnel: [],
    recentTeams: [],
  });

  const load = useCallback(async () => {
    if (!session || session.platformRole !== "admin") return;
    try {
      const res = await api<{
        dashboard: {
          totalTeams: number;
          teamsMissingMentor: number;
          teamsByStatus: Array<{ status: string; _count: number }>;
          ideaSubmissions: Array<{ status: string; _count: number }>;
          activeMentorAssignments: number;
          stageFunnel: Array<{
            id: string;
            name: string;
            sequence: number;
            deliverables: number;
            tracked: number;
          }>;
        };
        teams:
          | Array<{
              id: string;
              name: string;
              teamCode: string;
              theme?: string | null;
              status?: string;
              createdAt?: string;
              mentorAssignments: Array<{
                id: string;
                mentorUserId: string;
                mentor: { fullName: string };
                mentorType: string;
                industrialMentor?: { id: string; fullName: string } | null;
              }>;
            }>
          | {
              items: Array<{
                id: string;
                name: string;
                teamCode: string;
                theme?: string | null;
                status?: string;
                createdAt?: string;
                mentorAssignments: Array<{
                  id: string;
                  mentorUserId: string;
                  mentor: { fullName: string };
                  mentorType: string;
                  industrialMentor?: { id: string; fullName: string } | null;
                }>;
              }>;
            };
        mentors: Array<{ id: string; fullName: string; platformRole: string; additionalRoles?: string[]; email: string }>;
        users: PortalUser[];
      }>("/admin/bootstrap");

      const teamRows = Array.isArray(res.teams) ? res.teams : (res.teams?.items ?? []);

      setMetricsLive({
        totalTeams: res.dashboard.totalTeams,
        totalStudents: res.users.filter((u) => u.platformRole === "student").length,
        totalInstituteMentors: res.mentors.filter((m) => holdsRole(m, "institute_mentor")).length,
        totalIndustryMentors: res.mentors.filter((m) => holdsRole(m, "industry_mentor")).length,
        pendingAllocations: res.dashboard.teamsMissingMentor,
        activeStage: res.dashboard.stageFunnel[0]?.name ?? "—",
      });
      setUsers(res.users ?? []);

      setOverview({
        teamsByStatus: (res.dashboard.teamsByStatus ?? []).map((r) => ({ status: r.status, count: r._count })),
        ideaSubmissions: (res.dashboard.ideaSubmissions ?? []).map((r) => ({ status: r.status, count: r._count })),
        activeMentorAssignments: res.dashboard.activeMentorAssignments ?? 0,
        stageFunnel: res.dashboard.stageFunnel ?? [],
        recentTeams: teamRows.map((t) => ({
          id: t.id,
          name: t.name,
          teamCode: t.teamCode,
          track: t.theme ?? t.teamCode,
          status: t.status ?? "forming",
          createdAt: t.createdAt ?? "",
        })),
      });

      const instMentors = res.mentors.filter((m) => holdsRole(m, "institute_mentor"));
      setMentors(instMentors.map((m) => ({ id: m.id, name: m.fullName, title: m.email })));
      setIndustryMentorOptions(
        res.mentors.filter((m) => holdsRole(m, "industry_mentor")).map((m) => ({ id: m.id, name: m.fullName, title: m.email })),
      );

      setAllocations(
        teamRows.map((t) => {
          const inst = t.mentorAssignments.find((a) => a.mentorType === "institute");
          const ind = t.mentorAssignments.find((a) => a.mentorType === "industry");
          return {
            teamId: t.id,
            teamName: t.name,
            track: t.theme ?? t.teamCode,
            assignedMentorId: inst?.mentorUserId ?? null,
            assignedMentorName: inst?.mentor.fullName ?? null,
            assignedIndustryMentorId: ind?.mentorUserId ?? null,
            assignedIndustryMentorName: ind?.mentor.fullName ?? null,
            assignedMentorAssignmentId: inst?.id ?? null,
            assignedIndustryMentorAssignmentId: ind?.id ?? null,
            status: inst && ind ? "assigned" : "unassigned",
          };
        }),
      );
    } catch (err) {
      console.error("[admin.bootstrap]", err);
      // Keep previously loaded users/mentors on transient failures so imports stay visible.
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [pendingTeams, setPendingTeams] = useState<Set<string>>(new Set());

  /** Run one allocation change: lock the row, show failures, and always re-sync from the server. */
  const runAllocation = useCallback(
    async (teamId: string, optimistic: (a: AdminAllocation) => AdminAllocation, action: () => Promise<unknown>) => {
      setAllocationError(null);
      setPendingTeams((prev) => new Set(prev).add(teamId));
      setAllocations((prev) => prev.map((a) => (a.teamId === teamId ? optimistic(a) : a)));
      try {
        await action();
      } catch (err) {
        setAllocationError(err instanceof Error && err.message ? err.message : "Could not update the mentor allocation.");
      } finally {
        await load();
        setPendingTeams((prev) => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });
      }
    },
    [load],
  );

  const assignTeam = useCallback(
    (teamId: string, mentorId: string) => {
      const current = allocations.find((a) => a.teamId === teamId);
      if (!current || pendingTeams.has(teamId)) return;
      const name = mentors.find((m) => m.id === mentorId)?.name ?? null;
      void runAllocation(
        teamId,
        (a) => ({ ...a, assignedMentorId: mentorId || null, assignedMentorName: mentorId ? name : null }),
        async () => {
          if (!mentorId) {
            if (current.assignedMentorAssignmentId) {
              await apiPost(`/mentors/${current.assignedMentorAssignmentId}/unassign`, {});
            }
            return;
          }
          if (current.assignedMentorAssignmentId) {
            await apiPost(`/mentors/${current.assignedMentorAssignmentId}/reassign`, { mentorUserId: mentorId });
          } else {
            await apiPost("/mentors/allocate", {
              teamId,
              mentorUserId: mentorId,
              mentorType: "institute",
              assignmentMethod: "manual",
            });
          }
        },
      );
    },
    [allocations, mentors, pendingTeams, runAllocation],
  );

  const assignIndustryMentor = useCallback(
    (teamId: string, mentorUserId: string) => {
      const current = allocations.find((a) => a.teamId === teamId);
      if (!current || pendingTeams.has(teamId)) return;
      const name = industryMentorOptions.find((m) => m.id === mentorUserId)?.name ?? null;
      void runAllocation(
        teamId,
        (a) => ({
          ...a,
          assignedIndustryMentorId: mentorUserId || null,
          assignedIndustryMentorName: mentorUserId ? name : null,
        }),
        async () => {
          if (!mentorUserId) {
            if (current.assignedIndustryMentorAssignmentId) {
              await apiPost(`/mentors/${current.assignedIndustryMentorAssignmentId}/unassign`, {});
            }
            return;
          }
          await apiPost(`/teams/${teamId}/assign-industrial-mentor`, { userId: mentorUserId });
        },
      );
    },
    [allocations, industryMentorOptions, pendingTeams, runAllocation],
  );

  const metrics = useMemo(() => {
    if (metricsLive) return { ...metricsLive, pendingAllocations: allocations.filter((a) => a.status === "unassigned").length };
    const base = platformMetrics();
    return { ...base, pendingAllocations: allocations.filter((a) => a.status === "unassigned").length };
  }, [allocations, metricsLive]);

  return (
    <AdminContext.Provider
      value={{
        allocations,
        assignTeam,
        assignIndustryMentor,
        allocationError,
        clearAllocationError: () => setAllocationError(null),
        pendingTeams,
        metrics,
        overview,
        mentors,
        industryMentorOptions,
        users,
        reload: load,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
