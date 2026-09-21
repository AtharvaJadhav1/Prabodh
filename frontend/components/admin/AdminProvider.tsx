"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  platformMetrics,
  type AdminAllocation,
  type Broadcast,
  type StageConfig,
  type RubricCriterion,
} from "../../data/adminDashboard";
import type { Member } from "../../data/studentDashboard";
import type { IndustryMentor } from "../../data/mentorDashboard";
import { api, apiPatch, apiPost } from "../../lib/api";
import { useAuth } from "../auth/AuthProvider";
import type { PortalUser } from "../../lib/types";

export type LiveMentor = { id: string; name: string; title: string };

type AdminContextValue = {
  allocations: AdminAllocation[];
  assignTeam: (teamId: string, mentorId: string) => void;
  assignIndustryMentor: (teamId: string, mentorId: string) => void;
  broadcasts: Broadcast[];
  sendBroadcast: (b: Omit<Broadcast, "id" | "sentAt" | "sentBy">) => void;
  stages: StageConfig[];
  updateStage: (id: string, patch: Partial<StageConfig>) => void;
  updateStageRubric: (id: string, rubricCriteria: RubricCriterion[]) => void;
  students: Member[];
  industryMentors: IndustryMentor[];
  metrics: ReturnType<typeof platformMetrics>;
  teams: Array<{ teamId: string; teamName: string; track: string; score?: number; grade?: string }>;
  updateTeamScore: (teamId: string, score: number, grade: string) => void;
  mentors: LiveMentor[];
  industryMentorOptions: LiveMentor[];
  users: PortalUser[];
  reload: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

const audienceToRole: Record<Broadcast["audience"], string | undefined> = {
  all: undefined,
  students: "student",
  "institute-mentors": "institute_mentor",
  "industry-mentors": "industry_mentor",
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [allocations, setAllocations] = useState<AdminAllocation[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [teams, setTeams] = useState<Array<{ teamId: string; teamName: string; track: string; score?: number; grade?: string }>>([]);
  const [mentors, setMentors] = useState<LiveMentor[]>([]);
  const [industryMentorOptions, setIndustryMentorOptions] = useState<LiveMentor[]>([]);
  const [metricsLive, setMetricsLive] = useState<ReturnType<typeof platformMetrics> | null>(null);
  const [users, setUsers] = useState<PortalUser[]>([]);

  const load = useCallback(async () => {
    if (!session || session.platformRole !== "admin") return;
    try {
      const res = await api<{
        dashboard: {
          totalTeams: number;
          teamsMissingMentor: number;
          stageFunnel: Array<{ name: string }>;
        };
        teams:
          | Array<{
              id: string;
              name: string;
              teamCode: string;
              theme?: string | null;
              mentorAssignments: Array<{
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
                mentorAssignments: Array<{
                  mentorUserId: string;
                  mentor: { fullName: string };
                  mentorType: string;
                  industrialMentor?: { id: string; fullName: string } | null;
                }>;
              }>;
            };
        mentors: Array<{ id: string; fullName: string; platformRole: string; email: string }>;
        stages: Array<{
          id: string;
          name: string;
          sequence: number;
          deadline: string;
          isActive: boolean;
          rubrics: Array<{ id: string; criteria: string; weightage: string }>;
        }>;
        users: PortalUser[];
      }>("/admin/bootstrap");

      const teamRows = Array.isArray(res.teams) ? res.teams : (res.teams?.items ?? []);

      setMetricsLive({
        totalTeams: res.dashboard.totalTeams,
        totalStudents: res.users.filter((u) => u.platformRole === "student").length,
        totalInstituteMentors: res.mentors.filter((m) => m.platformRole === "institute_mentor").length,
        totalIndustryMentors: res.mentors.filter((m) => m.platformRole === "industry_mentor").length,
        pendingAllocations: res.dashboard.teamsMissingMentor,
        activeStage: res.dashboard.stageFunnel[0]?.name ?? "—",
      });
      setUsers(res.users ?? []);
      setTeams(
        teamRows.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          track: t.theme ?? "Unassigned",
        })),
      );

      const instMentors = res.mentors.filter((m) => m.platformRole === "institute_mentor");
      setMentors(instMentors.map((m) => ({ id: m.id, name: m.fullName, title: m.email })));
      setIndustryMentorOptions(
        res.mentors.filter((m) => m.platformRole === "industry_mentor").map((m) => ({ id: m.id, name: m.fullName, title: m.email })),
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
            status: inst && ind ? "assigned" : "unassigned",
          };
        }),
      );

      setStages(
        (res.stages ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          order: s.sequence,
          deadline: new Date(s.deadline).toLocaleString(),
          rubricCriteria: (s.rubrics ?? []).map((r) => ({
            id: r.id,
            label: r.criteria,
            maxScore: Number(r.weightage),
          })),
          status: s.isActive ? "active" : "closed",
        })),
      );
    } catch (err) {
      console.error("[admin.bootstrap]", err);
      // Keep previously loaded users/mentors on transient failures so imports stay visible.
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignTeam = useCallback(
    (teamId: string, mentorId: string) => {
      const current = allocations.find((a) => a.teamId === teamId);
      void (async () => {
        try {
          if (current?.assignedMentorId) {
            const teams = await api<{
              items: Array<{
                id: string;
                mentorAssignments: Array<{ id: string; mentorType: string; active?: boolean }>;
              }>;
            }>("/admin/teams?limit=50");
            const row = teams.items.find((t) => t.id === teamId);
            const assignment = row?.mentorAssignments.find((a) => a.mentorType === "institute");
            if (assignment) {
              await apiPost(`/mentors/${assignment.id}/reassign`, { mentorUserId: mentorId });
            }
          } else {
            await apiPost("/mentors/allocate", {
              teamId,
              mentorUserId: mentorId,
              mentorType: "institute",
              assignmentMethod: "manual",
            });
          }
          await load();
        } catch {
          /* ignore */
        }
      })();
    },
    [allocations, load],
  );

  const assignIndustryMentor = useCallback(
    (teamId: string, mentorUserId: string) => {
      if (!mentorUserId) return;
      void (async () => {
        try {
          await apiPost(`/teams/${teamId}/assign-industrial-mentor`, { userId: mentorUserId });
          await load();
        } catch {
          /* ignore */
        }
      })();
    },
    [load],
  );

  const sendBroadcast = useCallback(
    (b: Omit<Broadcast, "id" | "sentAt" | "sentBy">) => {
      const role = audienceToRole[b.audience];
      void apiPost("/broadcasts", {
        title: b.title,
        body: b.message,
        filterCriteria: role ? { role } : {},
      }).then(() => load());
      setBroadcasts((prev) => [
        { ...b, id: `BC-${Date.now()}`, sentAt: "Just now", sentBy: session?.fullName ?? "Admin" },
        ...prev,
      ]);
    },
    [load, session],
  );

  const updateStage = useCallback((id: string, patch: Partial<StageConfig>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const stage = stages.find((s) => s.id === id);
    if (!stage) return;
    if (patch.name || patch.deadline || patch.order) {
      const deadlineIso = patch.deadline?.includes("T") ? patch.deadline : new Date(stage.deadline).toISOString();
      void apiPatch("/stages/" + id, {
        name: patch.name ?? stage.name,
        sequence: patch.order ?? stage.order,
        deadline: Number.isNaN(Date.parse(deadlineIso)) ? new Date().toISOString() : new Date(deadlineIso).toISOString(),
      });
    }
    if (patch.status === "closed") {
      void api(`/stages/${id}`, { method: "DELETE" });
    }
  }, [stages]);

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
        broadcasts,
        sendBroadcast,
        stages,
        updateStage,
        updateStageRubric: (id, rubricCriteria) => {
          setStages((prev) => prev.map((s) => (s.id === id ? { ...s, rubricCriteria } : s)));
          for (const c of rubricCriteria) {
            if (!c.id && c.label) {
              void apiPost(`/stages/${id}/rubrics`, { criteria: c.label, weightage: c.maxScore || 0 });
            }
          }
        },
        students: users
          .filter((u) => u.platformRole === "student")
          .map((u) => ({
            name: u.fullName,
            initials: u.fullName.slice(0, 2).toUpperCase(),
            prn: u.email,
            branch: u.department ?? u.institute ?? "",
            role: "Member" as const,
            status: "Verified" as const,
          })),
        industryMentors: users
          .filter((u) => u.platformRole === "industry_mentor")
          .map((u) => ({
            id: u.id,
            name: u.fullName,
            initials: u.fullName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            email: u.email,
            phone: "",
            company: u.institute ?? "Partner",
            designation: u.department ?? "Industry Mentor",
            expertise: [],
            mappedTeamIds: [] as string[],
          })),
        metrics,
        teams,
        updateTeamScore: (teamId, score, grade) =>
          setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, score, grade } : t))),
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
