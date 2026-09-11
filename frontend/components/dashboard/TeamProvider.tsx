"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type Member, type JoinRequest, type OutgoingInvite, type StudentRole } from "../../data/studentDashboard";
import { api, apiPost } from "../../lib/api";
import type { PortalStage, PortalTeam } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";

type TeamContextValue = {
  team: PortalTeam | null;
  stages: PortalStage[];
  teamId: string | null;
  teamCode: string;
  teamName: string;
  capacity: number;
  members: Member[];
  invites: OutgoingInvite[];
  requests: JoinRequest[];
  requestResults: Record<number, "approved" | "rejected">;
  filledCount: number;
  pendingRequestCount: number;
  facultyInviteStatus: "none" | "sent" | "verified";
  facultyInviteEmail: string;
  role: StudentRole;
  isLead: boolean;
  drawerOpen: boolean;
  loading: boolean;
  error: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  approveRequest: (index: number) => void;
  rejectRequest: (index: number) => void;
  removeMember: (index: number) => void;
  sendInvite: (email: string) => boolean;
  revokeInvite: (email: string) => void;
  sendFacultyInvite: (email: string) => void;
  revokeFacultyInvite: () => void;
  reload: () => Promise<void>;
  createTeam: (name: string) => Promise<void>;
};

const TeamContext = createContext<TeamContextValue | null>(null);

function mapMembers(team: PortalTeam, cap: number): Member[] {
  const mapped: Member[] = team.members.map((m) => {
    const name = m.user?.fullName ?? m.invitedEmail;
    const accepted = m.inviteStatus === "accepted";
    return {
      name: accepted ? name : "Invite Pending",
      initials: accepted ? initials(name) : "?",
      prn: m.user?.email ?? m.invitedEmail,
      branch: m.user?.department ?? team.institute,
      role: accepted ? (m.user?.id === team.leaderUserId ? "Leader" : "Member") : null,
      status: accepted ? "Verified" : "Invite Pending",
      inviteEmail: m.invitedEmail,
    };
  });
  while (mapped.length < cap) {
    mapped.push({
      name: "Open Slot — Awaiting Member",
      initials: "?",
      prn: "",
      branch: "",
      role: null,
      status: "Empty",
    });
  }
  return mapped;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [team, setTeam] = useState<PortalTeam | null>(null);
  const [stages, setStages] = useState<PortalStage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<OutgoingInvite[]>([]);
  const [requests] = useState<JoinRequest[]>([]);
  const [requestResults, setRequestResults] = useState<Record<number, "approved" | "rejected">>({});
  const [facultyInviteStatus, setFacultyInviteStatus] = useState<"none" | "sent" | "verified">("none");
  const [facultyInviteEmail, setFacultyInviteEmail] = useState("");
  const [role, setRole] = useState<StudentRole>("Team Lead");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const [list, stageRows] = await Promise.all([
        api<{ items?: PortalTeam[] } | PortalTeam[]>("/teams"),
        api<PortalStage[]>("/stages"),
      ]);
      setStages(stageRows);
      const items = Array.isArray(list) ? list : list.items ?? [];
      let mine = items[0];
      if (!mine) {
        setTeam(null);
        setMembers([]);
        setInvites([]);
        setMemberIds({});
        return;
      }
      const detail = await api<PortalTeam>(`/teams/${mine.id}`);
      setTeam(detail);
      setMembers(mapMembers(detail, detail.memberCap));
      const pending = detail.members.filter((m) => m.inviteStatus === "pending");
      setInvites(
        pending.map((m) => ({
          email: m.invitedEmail,
          sentAt: "Pending",
          status: "Invitation Sent — Awaiting Student Accept",
        })),
      );
      const ids: Record<string, string> = {};
      for (const m of detail.members) ids[m.invitedEmail] = m.id;
      setMemberIds(ids);
      setRole(detail.leaderUserId === session.userId ? "Team Lead" : "Team Member");
      const inst = detail.mentorAssignments?.find((a) => a.mentorType === "institute");
      if (inst) {
        setFacultyInviteStatus("verified");
        setFacultyInviteEmail(inst.mentor.fullName);
      } else {
        setFacultyInviteStatus("none");
        setFacultyInviteEmail("");
      }
    } catch (err) {
      setTeam(null);
      setMembers([]);
      setError(err instanceof Error ? err.message : "Could not load team");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isLead = role === "Team Lead";
  const filledCount = useMemo(() => members.filter((m) => m.status === "Verified").length, [members]);
  const pendingRequestCount = useMemo(
    () => requests.filter((_, i) => !requestResults[i]).length,
    [requests, requestResults],
  );

  const sendInvite = (email: string) => {
    if (!email || !email.includes("@") || !team?.id) return false;
    void apiPost(`/teams/${team.id}/invite`, { email }).then(() => reload());
    return true;
  };

  const revokeInvite = (email: string) => {
    const id = memberIds[email];
    if (team?.id && id) {
      void apiPost(`/teams/${team.id}/invite/${id}/revoke`, {}).then(() => reload());
    }
  };

  return (
    <TeamContext.Provider
      value={{
        team,
        stages,
        teamId: team?.id ?? null,
        teamCode: team?.teamCode ?? "—",
        teamName: team?.name ?? "Your team",
        capacity: team?.memberCap ?? 6,
        members,
        invites,
        requests,
        requestResults,
        filledCount,
        pendingRequestCount,
        facultyInviteStatus,
        facultyInviteEmail,
        role,
        isLead,
        drawerOpen,
        loading,
        error,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        approveRequest: (index) => setRequestResults((prev) => ({ ...prev, [index]: "approved" })),
        rejectRequest: (index) => setRequestResults((prev) => ({ ...prev, [index]: "rejected" })),
        removeMember: () => undefined,
        sendInvite,
        revokeInvite,
        sendFacultyInvite: (email) => {
          setFacultyInviteStatus("sent");
          setFacultyInviteEmail(email);
        },
        revokeFacultyInvite: () => {
          setFacultyInviteStatus("none");
          setFacultyInviteEmail("");
        },
        reload,
        createTeam: async (name: string) => {
          await apiPost("/teams", { name, institute: session?.institute ?? "Institute" });
          await reload();
        },
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
