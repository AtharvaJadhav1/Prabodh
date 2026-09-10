"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  allGroups,
  initialIndustryMentors,
  initialAllocations,
  initialBroadcasts,
  initialStageConfigs,
  availableMentors,
  platformMetrics,
  type AdminAllocation,
  type Broadcast,
  type StageConfig,
  type RubricCriterion,
} from "../../data/adminDashboard";
import { initialMembers, type Member } from "../../data/studentDashboard";
import { type IndustryMentor } from "../../data/mentorDashboard";

type AdminContextValue = {
  allocations: AdminAllocation[];
  assignTeam: (teamId: string, mentorId: string) => void;
  broadcasts: Broadcast[];
  sendBroadcast: (b: Omit<Broadcast, "id" | "sentAt" | "sentBy">) => void;
  stages: StageConfig[];
  updateStage: (id: string, patch: Partial<StageConfig>) => void;
  updateStageRubric: (id: string, rubricCriteria: RubricCriterion[]) => void;
  students: Member[];
  industryMentors: IndustryMentor[];
  metrics: ReturnType<typeof platformMetrics>;
  teams: typeof allGroups;
  updateTeamScore: (teamId: string, score: number, grade: string) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [allocations, setAllocations] = useState<AdminAllocation[]>(initialAllocations);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts);
  const [stages, setStages] = useState<StageConfig[]>(initialStageConfigs);
  const [teams, setTeams] = useState(allGroups);

  const assignTeam = useCallback((teamId: string, mentorId: string) => {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.teamId !== teamId) return a;
        const found = availableMentors.find((m) => m.id === mentorId);
        return {
          ...a,
          assignedMentorId: mentorId || null,
          assignedMentorName: found ? found.name : null,
          status: mentorId ? "assigned" : "unassigned",
        };
      }),
    );
  }, []);

  const sendBroadcast = useCallback((b: Omit<Broadcast, "id" | "sentAt" | "sentBy">) => {
    setBroadcasts((prev) => [
      {
        ...b,
        id: `BC-${String(prev.length + 1).padStart(3, "0")}`,
        sentAt: "Just now",
        sentBy: "Priya Deshpande",
      },
      ...prev,
    ]);
  }, []);

  const updateStage = useCallback((id: string, patch: Partial<StageConfig>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const updateStageRubric = useCallback((id: string, rubricCriteria: RubricCriterion[]) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, rubricCriteria } : s)));
  }, []);

  const updateTeamScore = useCallback((teamId: string, score: number, grade: string) => {
    setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, score, grade } : t)));
  }, []);

  const metrics = useMemo(() => {
    const base = platformMetrics();
    return { ...base, pendingAllocations: allocations.filter((a) => a.status === "unassigned").length };
  }, [allocations]);

  return (
    <AdminContext.Provider
      value={{
        allocations,
        assignTeam,
        broadcasts,
        sendBroadcast,
        stages,
        updateStage,
        updateStageRubric,
        students: initialMembers,
        industryMentors: initialIndustryMentors,
        metrics,
        teams,
        updateTeamScore,
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
