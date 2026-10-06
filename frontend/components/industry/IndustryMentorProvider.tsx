"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { InviteStatus, MentorInvite } from "../../data/industryDashboard";
import { type MentorGroup } from "../../data/mentorDashboard";
import { api, apiPost } from "../../lib/api";
import { isAlreadyAnswered } from "../../lib/invite-errors";
import { initials } from "../../lib/initials";
import { useAuth } from "../auth/AuthProvider";

export type AcceptedMentor = {
  instituteMentorId: string;
  instituteMentorName: string;
  instituteMentorInitials: string;
  instituteMentorTitle: string;
  groupIds: string[];
};

type IndustryMentorContextValue = {
  pendingInvites: MentorInvite[];
  inviteHistory: MentorInvite[];
  acceptedInvites: MentorInvite[];
  acceptedMentors: AcceptedMentor[];
  pendingCount: number;
  selectedMentorIds: string[];
  toggleMentorSelection: (instituteMentorId: string) => void;
  visibleTeams: MentorGroup[];
  /** Every assigned team, ignoring the mentor filter. */
  allTeams: MentorGroup[];
  teamMentors: (teamCode: string) => AcceptedMentor[];
  acceptInvite: (id: string) => Promise<void>;
  declineInvite: (id: string) => Promise<void>;
  /** True until the first teams + invites load has finished. */
  isLoading: boolean;
  /** Teams or pending-invites load failure (last known data is kept). */
  error: string | null;
  /** Invite history load failure (pending invites may still be fine). */
  historyError: string | null;
  reload: () => Promise<void>;
};

const IndustryMentorContext = createContext<IndustryMentorContextValue | null>(null);

type TeamApiRow = {
  team: {
    id: string;
    name: string;
    teamCode: string;
    theme?: string | null;
    leader?: { fullName: string; email: string } | null;
    problemStatement?: { code: string; title: string } | null;
    members?: unknown[];
    mentorAssignments?: Array<{ mentorType: string; mentor: { id: string; fullName: string; email: string } }>;
  };
  pendingInvite?: boolean;
};

type InviteApiRow = {
  id: string;
  teamId: string;
  invitedEmail: string;
  mentorUserId: string | null;
  mentorType: string;
  inviteStatus: string;
  invitedById: string;
  createdAt: string;
  updatedAt?: string;
  invitedBy?: { id: string; fullName: string; email: string } | null;
  team: {
    id: string;
    name: string;
    teamCode: string;
    leader?: { fullName: string; email: string } | null;
    problemStatement?: { code: string; title: string } | null;
  };
};

function toInvite(row: InviteApiRow): MentorInvite {
  const team = row.team;
  const status: InviteStatus =
    row.inviteStatus === "accepted" || row.inviteStatus === "revoked" || row.inviteStatus === "expired"
      ? row.inviteStatus
      : "pending";
  return {
    id: row.id,
    teamName: team.name,
    teamCode: team.teamCode ?? team.id,
    invitedByName: row.invitedBy?.fullName ?? null,
    status,
    invitedAt: new Date(row.createdAt).toLocaleDateString(),
    respondedAt: status === "pending" || !row.updatedAt ? null : new Date(row.updatedAt).toLocaleDateString(),
  };
}

export function IndustryMentorProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.userId ?? null;
  const [pendingInvites, setPendingInvites] = useState<MentorInvite[]>([]);
  const [inviteHistory, setInviteHistory] = useState<MentorInvite[]>([]);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [visibleTeams, setVisibleTeams] = useState<MentorGroup[]>([]);
  const [acceptedMentors, setAcceptedMentors] = useState<AcceptedMentor[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Out-of-order guards: only the newest request of each kind may write state.
  const teamsReq = useRef(0);
  const invitesReq = useRef(0);
  const teamsInFlight = useRef<Promise<void> | null>(null);
  const invitesInFlight = useRef<Promise<void> | null>(null);
  const lastFetchAt = useRef(0);

  /** `force` skips in-flight de-duplication (used after a mutation so the response is never stale). */
  const loadTeams = useCallback(
    (force = false): Promise<void> => {
      if (!userId) return Promise.resolve();
      if (!force && teamsInFlight.current) return teamsInFlight.current;
      const reqId = ++teamsReq.current;
      const run = (async () => {
        try {
          const rows = await api<TeamApiRow[]>("/mentors/me/teams?mentorType=industry");
          if (reqId !== teamsReq.current) return;
          const mentorsById = new Map<string, AcceptedMentor>();
          const teams = rows
            .filter((row) => !row.pendingInvite)
            .map((row) => {
              for (const a of row.team.mentorAssignments ?? []) {
                if (a.mentorType !== "institute") continue;
                let m = mentorsById.get(a.mentor.id);
                if (!m) {
                  m = {
                    instituteMentorId: a.mentor.id,
                    instituteMentorName: a.mentor.fullName,
                    instituteMentorInitials: initials(a.mentor.fullName),
                    instituteMentorTitle: a.mentor.email,
                    groupIds: [],
                  };
                  mentorsById.set(a.mentor.id, m);
                }
                if (!m.groupIds.includes(row.team.teamCode)) {
                  m.groupIds.push(row.team.teamCode);
                }
              }
              return {
                id: row.team.id,
                teamName: row.team.name,
                teamId: row.team.teamCode,
                memberCount: row.team.members?.length ?? 0,
                track: row.team.theme ?? "Unassigned",
                problemCode: row.team.problemStatement?.code ?? "—",
                problemTitle: row.team.problemStatement?.title ?? "No PS locked yet",
                leader: row.team.leader?.fullName ?? "—",
                leaderPrn: row.team.leader?.email ?? "",
                milestone: "Assigned",
                domains: row.team.theme ? [row.team.theme] : [],
              };
            });
          setVisibleTeams(teams);
          setAcceptedMentors([...mentorsById.values()]);
          setTeamsError(null);
          setTeamsLoaded(true);
        } catch (err) {
          if (reqId !== teamsReq.current) return;
          // Keep the last known teams, but tell the user the refresh failed.
          setTeamsError(err instanceof Error && err.message ? err.message : "Could not load your assigned teams.");
          setTeamsLoaded(true);
        } finally {
          if (reqId === teamsReq.current) teamsInFlight.current = null;
        }
      })();
      teamsInFlight.current = run;
      return run;
    },
    [userId],
  );

  const loadInvites = useCallback(
    (force = false): Promise<void> => {
      if (!userId) return Promise.resolve();
      if (!force && invitesInFlight.current) return invitesInFlight.current;
      const reqId = ++invitesReq.current;
      const run = (async () => {
        try {
          const [pending, history] = await Promise.all([
            api<InviteApiRow[]>("/mentors/invites?mentorType=industry"),
            api<InviteApiRow[]>("/mentors/invites?history=1&mentorType=industry").then(
              (rows) => ({ rows, failed: false as const }),
              () => ({ rows: [] as InviteApiRow[], failed: true as const }),
            ),
          ]);
          if (reqId !== invitesReq.current) return;
          setPendingInvites(pending.filter((row) => row.inviteStatus === "pending").map(toInvite));
          setInvitesError(null);
          if (history.failed) {
            setHistoryError("Could not load your invite history.");
          } else {
            setInviteHistory(history.rows.map(toInvite));
            setHistoryError(null);
          }
          setInvitesLoaded(true);
        } catch (err) {
          if (reqId !== invitesReq.current) return;
          setInvitesError(err instanceof Error && err.message ? err.message : "Could not load your invites.");
          setInvitesLoaded(true);
        } finally {
          if (reqId === invitesReq.current) invitesInFlight.current = null;
        }
      })();
      invitesInFlight.current = run;
      return run;
    },
    [userId],
  );

  const reload = useCallback(async () => {
    lastFetchAt.current = Date.now();
    await Promise.all([loadTeams(true), loadInvites(true)]);
  }, [loadTeams, loadInvites]);

  // Reset when the signed-in user changes, then load once for that user.
  useEffect(() => {
    teamsReq.current++;
    invitesReq.current++;
    teamsInFlight.current = null;
    invitesInFlight.current = null;
    setPendingInvites([]);
    setInviteHistory([]);
    setVisibleTeams([]);
    setAcceptedMentors([]);
    setSelectedMentorIds([]);
    setTeamsLoaded(false);
    setInvitesLoaded(false);
    setTeamsError(null);
    setInvitesError(null);
    setHistoryError(null);
    if (userId) {
      lastFetchAt.current = Date.now();
      void loadTeams();
      void loadInvites();
    }
  }, [userId, loadTeams, loadInvites]);

  // An admin override in another session won't push to this tab — reconcile
  // whenever the mentor comes back to this tab/window (focus + visibilitychange
  // fire together, so debounce them into a single refresh).
  useEffect(() => {
    const refresh = () => {
      if (Date.now() - lastFetchAt.current < 3000) return;
      lastFetchAt.current = Date.now();
      void loadTeams();
      void loadInvites();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadTeams, loadInvites]);

  const pendingCount = pendingInvites.length;

  const acceptedInvites = useMemo(
    () => inviteHistory.filter((inv) => inv.status === "accepted"),
    [inviteHistory],
  );

  const toggleMentorSelection = useCallback((instituteMentorId: string) => {
    setSelectedMentorIds((prev) =>
      prev.includes(instituteMentorId)
        ? prev.filter((id) => id !== instituteMentorId)
        : [...prev, instituteMentorId],
    );
  }, []);

  const filteredTeams = useMemo(() => {
    if (selectedMentorIds.length === 0) return visibleTeams;
    const codes = new Set(
      acceptedMentors.filter((m) => selectedMentorIds.includes(m.instituteMentorId)).flatMap((m) => m.groupIds),
    );
    return visibleTeams.filter((t) => codes.has(t.teamId));
  }, [visibleTeams, selectedMentorIds, acceptedMentors]);

  const teamMentors = useCallback(
    (teamCode: string) => acceptedMentors.filter((m) => m.groupIds.includes(teamCode)),
    [acceptedMentors],
  );

  const acceptInvite = useCallback(
    async (id: string) => {
      let result: { accepted?: boolean } | null = null;
      try {
        result = await apiPost<{ accepted?: boolean }>(`/mentors/invites/${id}/accept`, {});
      } catch (err) {
        if (isAlreadyAnswered(err)) {
          await reload(); // answered elsewhere: refresh so the stale card disappears, no red error
          return;
        }
        throw err;
      }
      await reload();
      if (result && result.accepted === false) {
        throw new Error("This team already has an industry mentor (or the invitation expired), so it could not be accepted.");
      }
    },
    [reload],
  );

  const declineInvite = useCallback(
    async (id: string) => {
      try {
        await apiPost(`/mentors/invites/${id}/decline`, {});
      } catch (err) {
        if (!isAlreadyAnswered(err)) throw err;
      }
      await loadInvites(true);
    },
    [loadInvites],
  );

  return (
    <IndustryMentorContext.Provider
      value={{
        pendingInvites,
        inviteHistory,
        acceptedInvites,
        acceptedMentors,
        pendingCount,
        selectedMentorIds,
        toggleMentorSelection,
        visibleTeams: filteredTeams,
        allTeams: visibleTeams,
        teamMentors,
        acceptInvite,
        declineInvite,
        isLoading: !(teamsLoaded && invitesLoaded),
        error: invitesError ?? teamsError,
        historyError,
        reload,
      }}
    >
      {children}
    </IndustryMentorContext.Provider>
  );
}

export function useIndustryMentor() {
  const ctx = useContext(IndustryMentorContext);
  if (!ctx) throw new Error("useIndustryMentor must be used within IndustryMentorProvider");
  return ctx;
}