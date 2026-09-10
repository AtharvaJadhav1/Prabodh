"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  STUDENT_ROLE_KEY,
  initialMembers,
  initialInvites,
  initialRequests,
  type Member,
  type JoinRequest,
  type OutgoingInvite,
  type StudentRole,
} from "../../data/studentDashboard";

type TeamContextValue = {
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
  openDrawer: () => void;
  closeDrawer: () => void;
  approveRequest: (index: number) => void;
  rejectRequest: (index: number) => void;
  removeMember: (index: number) => void;
  sendInvite: (email: string) => boolean;
  revokeInvite: (email: string) => void;
  sendFacultyInvite: (email: string) => void;
  revokeFacultyInvite: () => void;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invites, setInvites] = useState<OutgoingInvite[]>(initialInvites);
  const [requests, setRequests] = useState<JoinRequest[]>(initialRequests);
  const [requestResults, setRequestResults] = useState<Record<number, "approved" | "rejected">>({});
  const [facultyInviteStatus, setFacultyInviteStatus] = useState<"none" | "sent" | "verified">("none");
  const [facultyInviteEmail, setFacultyInviteEmail] = useState("");
  const [role, setRole] = useState<StudentRole>("Team Lead");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STUDENT_ROLE_KEY);
      if (stored === "Team Lead" || stored === "Team Member") setRole(stored);
    } catch {
      /* ignore storage access errors */
    }
  }, []);

  const isLead = role === "Team Lead";

  const filledCount = useMemo(
    () => members.filter((m) => m.status === "Verified").length,
    [members]
  );

  const pendingRequestCount = useMemo(
    () => requests.filter((_, i) => !requestResults[i]).length,
    [requests, requestResults]
  );

  const approveRequest = (index: number) => {
    const req = requests[index];
    if (!req) return;
    setRequestResults((prev) => ({ ...prev, [index]: "approved" }));
    setMembers((prev) => {
      if (prev.some((m) => m.status === "Verified" && m.name === req.name)) return prev;
      const copy = [...prev];
      const emptyIndex = copy.findIndex((m) => m.status === "Empty");
      if (emptyIndex === -1) return prev;
      copy[emptyIndex] = {
        name: req.name,
        initials: req.initials,
        prn: req.prn,
        branch: req.branch,
        role: "Member",
        status: "Verified",
      };
      return copy;
    });
  };

  const rejectRequest = (index: number) => {
    setRequestResults((prev) => ({ ...prev, [index]: "rejected" }));
  };

  const removeMember = (index: number) => {
    setMembers((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (!target || target.role === "Leader" || target.status !== "Verified") return prev;
      copy[index] = {
        name: "Open Slot — Awaiting Member",
        initials: "?",
        prn: "",
        branch: "",
        role: null,
        status: "Empty",
      };
      return copy;
    });
  };

  const sendInvite = (email: string) => {
    if (!email || !email.includes("@")) return false;
    if (invites.some((i) => i.email === email)) return false;
    setInvites((prev) => [
      ...prev,
      {
        email,
        sentAt: "Just now • live dispatch",
        status: "Invitation Sent — Awaiting Student Accept",
      },
    ]);
    setMembers((prev) => {
      const copy = [...prev];
      const emptyIndex = copy.findIndex((m) => m.status === "Empty");
      if (emptyIndex === -1) return prev;
      copy[emptyIndex] = {
        name: "Open Slot — Invite Pending",
        initials: "?",
        prn: email,
        branch: "",
        role: null,
        status: "Invite Pending",
        inviteEmail: email,
      };
      return copy;
    });
    return true;
  };

  const revokeInvite = (email: string) => {
    setInvites((prev) => prev.filter((i) => i.email !== email));
    setMembers((prev) =>
      prev.map((m) =>
        m.status === "Invite Pending" && m.inviteEmail === email
          ? {
              name: "Open Slot — Awaiting Member",
              initials: "?",
              prn: "",
              branch: "",
              role: null,
              status: "Empty",
              inviteEmail: undefined,
            }
          : m
      )
    );
  };

  const sendFacultyInvite = (email: string) => {
    setFacultyInviteStatus("sent");
    setFacultyInviteEmail(email);
  };

  const revokeFacultyInvite = () => {
    setFacultyInviteStatus("none");
    setFacultyInviteEmail("");
  };

  return (
    <TeamContext.Provider
      value={{
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
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        approveRequest,
        rejectRequest,
        removeMember,
        sendInvite,
        revokeInvite,
        sendFacultyInvite,
        revokeFacultyInvite,
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