"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Member, type JoinRequest, type OutgoingInvite, type StudentRole } from "../../data/studentDashboard";
import { api, apiDelete, apiPatch, apiPost } from "../../lib/api";
import { avatarUrlFrom } from "../../lib/avatar";
import type { PortalStage, PortalTeam } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";

export type PsPreferenceInput =
  | { rank: number; psId: string }
  | { rank: number; title: string; theme: string; category: "software" | "hardware"; organisation: string; description: string };

type TeamContextValue = {
  team: PortalTeam | null;
  stages: PortalStage[];
  teamId: string | null;
  teamCode: string;
  teamName: string;
  capacity: number;
  teamAvatarCount: number;
  cycleTeamAvatar: () => void;
  members: Member[];
  invites: OutgoingInvite[];
  requests: JoinRequest[];
  requestResults: Record<number, "approved" | "rejected">;
  filledCount: number;
  pendingRequestCount: number;
  facultyInviteStatus: "none" | "sent" | "verified";
  facultyInviteEmail: string;
  mentorLocked: boolean;
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
  sendInvite: (email: string) => Promise<{ ok: boolean; emailSent: boolean; emailError?: string | null }>;
  revokeInvite: (inviteId: string) => Promise<void>;
  savePreferences: (preferences: PsPreferenceInput[]) => Promise<void>;
  submitPreferences: (preferences: PsPreferenceInput[]) => Promise<{ sent: boolean; code?: string }>;
  sendFacultyInvite: (email: string, mentorType?: "institute" | "industry") => Promise<boolean>;
  revokeFacultyInvite: (inviteId?: string) => void;
  facultyDirectory: Array<{
    id: string;
    fullName: string;
    email: string;
    department?: string | null;
    platformRole: string;
    domainTags: string[];
  }>;
  loadFacultyDirectory: () => Promise<void>;
  reload: () => Promise<void>;
  createTeam: (name: string) => Promise<void>;
  renameTeam: (name: string) => Promise<void>;
  removeCommentLocally: (commentId: string) => void;
  addCommentLocally: (comment: import("../../lib/types").PortalComment) => void;
};

const TeamContext = createContext<TeamContextValue | null>(null);

function mapMembers(team: PortalTeam, cap: number): Member[] {
  const live = team.members.filter((m) => m.inviteStatus === "pending" || m.inviteStatus === "accepted");
  const mapped: Member[] = live.map((m) => {
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
      avatarUrl: accepted ? avatarUrlFrom(m.user?.profileJson) : null,
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

const AVATAR_KEY_PREFIX = "team-avatar:";

export function TeamProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const userId = session?.userId;
  const [team, setTeam] = useState<PortalTeam | null>(null);
  const [stages, setStages] = useState<PortalStage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<OutgoingInvite[]>([]);
  const [requests] = useState<JoinRequest[]>([]);
  const [requestResults, setRequestResults] = useState<Record<number, "approved" | "rejected">>({});
  const [facultyInviteStatus, setFacultyInviteStatus] = useState<"none" | "sent" | "verified">("none");
  const [facultyInviteEmail, setFacultyInviteEmail] = useState("");
  const [mentorLocked, setMentorLocked] = useState(false);
  const [role, setRole] = useState<StudentRole>("Team Lead");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [facultyDirectory, setFacultyDirectory] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      department?: string | null;
      platformRole: string;
      domainTags: string[];
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [teamAvatarCount, setTeamAvatarCount] = useState(0);
  const stagesLoaded = useRef(false);
  const teamRef = useRef<PortalTeam | null>(null);
  const reloadPromiseRef = useRef<Promise<void> | null>(null);
  teamRef.current = team;

  useEffect(() => {
    if (!team?.id) return;
    try {
      const raw = window.localStorage.getItem(AVATAR_KEY_PREFIX + team.id);
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= 0) setTeamAvatarCount(parsed);
    } catch {
      // storage unavailable — keep default avatar count
    }
  }, [team?.id]);

  const cycleTeamAvatar = useCallback(() => {
    if (!team?.id) return;
    setTeamAvatarCount((prev) => {
      const next = prev + 1;
      try {
        window.localStorage.setItem(AVATAR_KEY_PREFIX + team.id, String(next));
      } catch {
        // storage unavailable — still shuffle for this session
      }
      return next;
    });
  }, [team?.id]);

  const applyTeamDetail = useCallback((detail: PortalTeam) => {
    setTeam(detail);
    setMembers(mapMembers(detail, detail.memberCap));
    const pending = detail.members.filter((m) => m.inviteStatus === "pending");
    setInvites(
      pending.map((m) => ({
        id: m.id,
        email: m.invitedEmail,
        sentAt: "Pending",
        status: "Invitation Sent — Awaiting Student Accept",
      })),
    );
    const ids: Record<string, string> = {};
    for (const m of detail.members) ids[m.invitedEmail] = m.id;
    setMemberIds(ids);
    if (userId) {
      setRole(detail.leaderUserId === userId ? "Team Lead" : "Team Member");
    }
    const inst = detail.mentorAssignments?.find((a) => a.mentorType === "institute");
    const pendingMentor = detail.mentorInvites?.find((i) => i.inviteStatus === "pending");
    setMentorLocked(Boolean(inst) || Boolean(detail.mentorLockedAt));
    if (inst) {
      setFacultyInviteStatus("verified");
      setFacultyInviteEmail(inst.mentor.fullName);
    } else if (pendingMentor) {
      setFacultyInviteStatus("sent");
      setFacultyInviteEmail(pendingMentor.mentor?.fullName ?? pendingMentor.invitedEmail);
    } else {
      setFacultyInviteStatus("none");
      setFacultyInviteEmail("");
    }
  }, [userId]);

  const reload = useCallback(async () => {
    if (!userId) return;
    if (reloadPromiseRef.current) return reloadPromiseRef.current;

    const run = (async () => {
      // Soft refresh: keep showing existing team UI instead of blanking the whole dashboard.
      const soft = teamRef.current != null;
      if (!soft) setLoading(true);
      setError(null);
      try {
        const stagesPromise = stagesLoaded.current
          ? Promise.resolve(null)
          : api<PortalStage[]>("/stages").then((stageRows) => {
              setStages(stageRows);
              stagesLoaded.current = true;
              return stageRows;
            });
        await stagesPromise;
        let teamId = teamRef.current?.id;
        if (!teamId) {
          const list = await api<{ items?: PortalTeam[] } | PortalTeam[]>("/teams");
          const items = Array.isArray(list) ? list : list.items ?? [];
          teamId = items[0]?.id;
        }
        if (!teamId) {
          setTeam(null);
          setMembers([]);
          setInvites([]);
          setMemberIds({});
          return;
        }
        const detail = await api<PortalTeam>(`/teams/${teamId}`);
        applyTeamDetail(detail);
      } catch (err) {
        if (!soft) {
          setTeam(null);
          setMembers([]);
        }
        setError(err instanceof Error ? err.message : "Could not load team");
      } finally {
        setLoading(false);
      }
    })();

    reloadPromiseRef.current = run;
    run.finally(() => {
      if (reloadPromiseRef.current === run) reloadPromiseRef.current = null;
    }).catch(() => undefined);
    return run;
  }, [userId, applyTeamDetail]);

  const loadFacultyDirectory = useCallback(async () => {
    if (facultyDirectory.length) return;
    try {
      const faculty = await api<
        Array<{
          id: string;
          fullName: string;
          email: string;
          department?: string | null;
          platformRole: string;
          domainTags: string[];
        }>
      >("/mentors/faculty");
      setFacultyDirectory(faculty);
    } catch {
      setFacultyDirectory([]);
    }
  }, [facultyDirectory.length]);

  useEffect(() => {
    if (!ready || !userId) return;
    void reload();
  }, [ready, userId, reload]);

  const isLead = role === "Team Lead";
  const filledCount = useMemo(() => members.filter((m) => m.status === "Verified").length, [members]);
  const pendingRequestCount = useMemo(
    () => requests.filter((_, i) => !requestResults[i]).length,
    [requests, requestResults],
  );

  const sendInvite = async (email: string) => {
    if (!email || !email.includes("@") || !team?.id) return { ok: false, emailSent: false };
    const optimisticId = `optimistic-${email}`;
    setInvites((prev) => [
      ...prev.filter((i) => i.email !== email),
      { id: optimisticId, email, sentAt: "Just now", status: "Invitation Sent — Awaiting Student Accept" },
    ]);
    try {
      const result = await apiPost<{ id: string; emailSent?: boolean; emailError?: string | null }>(
        `/teams/${team.id}/invite`,
        { email },
      );
      setInvites((prev) => prev.map((i) => (i.id === optimisticId ? { ...i, id: result.id } : i)));
      void reload();
      return {
        ok: true,
        emailSent: Boolean(result.emailSent ?? true),
        emailError: result.emailError ?? null,
      };
    } catch (err) {
      setInvites((prev) => prev.filter((i) => i.id !== optimisticId));
      throw err;
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!team?.id) return;
    if (inviteId.startsWith("optimistic-")) {
      await reload();
      return;
    }
    await apiPost(`/teams/${team.id}/invite/${inviteId}/revoke`, {});
    await reload();
  };

  const mergePsPreferences = useCallback((preferences: PortalTeam["psPreferences"]) => {
    if (!preferences) return;
    setTeam((prev) => (prev ? { ...prev, psPreferences: preferences } : prev));
  }, []);

  const syncPsPreferences = useCallback(async () => {
    const id = teamRef.current?.id;
    if (!id) return;
    try {
      const preferences = await api<PortalTeam["psPreferences"]>(`/teams/${id}/ps-preferences`);
      const approved = preferences?.some((p) => p.status === "approved");
      if (approved && !teamRef.current?.problemStatement) {
        await reload();
        return;
      }
      mergePsPreferences(preferences);
    } catch {
      /* keep current UI on transient errors */
    }
  }, [mergePsPreferences, reload]);

  useEffect(() => {
    const id = team?.id;
    const awaitingMentor =
      Boolean(id) &&
      !team?.problemStatement &&
      (team?.psPreferences ?? []).some((p) => p.status === "submitted");
    if (!awaitingMentor) return;
    const timer = window.setInterval(() => {
      void syncPsPreferences();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [team?.id, team?.problemStatement, team?.psPreferences, syncPsPreferences]);

  const savePreferences = async (preferences: PsPreferenceInput[]) => {
    if (!team?.id) return;
    const result = await apiPost<{ preferences: PortalTeam["psPreferences"] }>(
      `/teams/${team.id}/ps-preferences`,
      { preferences },
    );
    mergePsPreferences(result.preferences);
  };

  const submitPreferences = async (preferences: PsPreferenceInput[]) => {
    if (!team?.id) return { sent: false };
    const result = await apiPost<{
      sent: boolean;
      code?: string;
      preferences?: PortalTeam["psPreferences"];
    }>(`/teams/${team.id}/ps-preferences/submit`, { preferences });
    if (result.preferences) {
      mergePsPreferences(result.preferences);
    }
    return result;
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
        teamAvatarCount,
        cycleTeamAvatar,
        members,
        invites,
        requests,
        requestResults,
        filledCount,
        pendingRequestCount,
        facultyInviteStatus,
        facultyInviteEmail,
        mentorLocked,
        role,
        isLead,
        drawerOpen,
        loading,
        error,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        approveRequest: (index) => setRequestResults((prev) => ({ ...prev, [index]: "approved" })),
        rejectRequest: (index) => setRequestResults((prev) => ({ ...prev, [index]: "rejected" })),
        removeMember: (index: number) => {
          const member = members[index];
          const id = member?.inviteEmail ? memberIds[member.inviteEmail] : undefined;
          if (!team?.id || !id || !isLead) return;
          void apiDelete(`/teams/${team.id}/members/${id}`).then(() => reload());
        },
        sendInvite,
        revokeInvite,
        savePreferences,
        submitPreferences,
        facultyDirectory,
        loadFacultyDirectory,
        sendFacultyInvite: async (email, mentorType = "institute") => {
          if (!team?.id || !email.includes("@")) return false;
          const result = await apiPost<{ emailSent?: boolean; emailError?: string | null }>("/mentors/invite", {
            teamId: team.id,
            email,
            mentorType,
          });
          await reload();
          if (result.emailError) {
            throw new Error(result.emailError);
          }
          return Boolean(result.emailSent ?? true);
        },
        revokeFacultyInvite: (inviteId) => {
          const pending = inviteId
            ? team?.mentorInvites?.find((i) => i.id === inviteId)
            : team?.mentorInvites?.find((i) => i.inviteStatus === "pending");
          if (pending) {
            void apiPost(`/mentors/invites/${pending.id}/revoke`, {}).then(() => reload());
          }
        },
        reload,
        removeCommentLocally: (commentId: string) => {
          setTeam((prev) => {
            if (!prev) return prev;
            const next = {
              ...prev,
              comments: (prev.comments ?? []).filter((c) => c.id !== commentId),
            };
            teamRef.current = next;
            return next;
          });
        },
        addCommentLocally: (comment) => {
          setTeam((prev) => {
            if (!prev) return prev;
            const existing = prev.comments ?? [];
            if (existing.some((c) => c.id === comment.id)) return prev;
            const next = { ...prev, comments: [...existing, comment] };
            teamRef.current = next;
            return next;
          });
        },
        createTeam: async (name: string) => {
          const institute = session?.institute?.trim() || "Institute";
          await apiPost("/teams", { name, institute });
          await reload();
        },
        renameTeam: async (name: string) => {
          if (!team?.id) return;
          if (team.status === "locked") throw new Error("Team details are locked");
          await apiPatch(`/teams/${team.id}`, { name });
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
