"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, api, apiPost } from "../../lib/api";
import { initials } from "../../lib/initials";
import { setAccessToken } from "../../lib/auth-token";
import { clearApiCache } from "../../lib/api-cache";
import {
  allRoles,
  clearSession,
  dashboardForRole,
  landingForLogin,
  readLastActiveRole,
  readSession,
  writeLastActiveRole,
  writeSession,
  type PlatformRole,
  type Session,
} from "../../lib/session";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  establishSession: (payload: {
    accessToken: string;
    userId: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    additionalRoles?: PlatformRole[] | null;
    activeRole?: PlatformRole | null;
    institute?: string | null;
    department?: string | null;
    phone?: string | null;
    profileJson?: Record<string, unknown> | null;
    mustChangePassword?: boolean;
  }) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  /**
   * Switch a dual-role account to another held workspace (persists + redirects).
   * Rejects (and keeps the current role) when the server refuses the switch.
   */
  switchRole: (role: PlatformRole) => Promise<void>;
  /** Align activeRole with the dashboard the user is already on — persists but does NOT navigate. */
  syncActiveRole: (role: PlatformRole) => Promise<void>;
};

type ActiveRoleResponse = {
  accessToken: string;
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  additionalRoles?: PlatformRole[] | null;
  activeRole?: PlatformRole | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Drop every trace of the signed-in session from this tab. Callers are responsible for the
 * navigation (and for clearing React state via setSession) — this only handles storage, the
 * in-memory access token, and the API response cache.
 */
export function wipeClientSession() {
  clearApiCache();
  clearSession();
  setAccessToken(null);
}

function toSession(user: {
  userId?: string;
  id?: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  additionalRoles?: PlatformRole[] | null;
  activeRole?: PlatformRole | null;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  accessToken?: string;
  linkedinUrl?: string | null;
  profileJson?: Record<string, unknown> | null;
  mustChangePassword?: boolean;
}): Session {
  const userId = user.userId ?? user.id ?? "";
  const extras = Array.isArray(user.additionalRoles)
    ? user.additionalRoles.filter((r) => r !== user.platformRole)
    : [];
  const held: PlatformRole[] = [user.platformRole, ...extras];
  // Honor an explicit activeRole (server-issued after a switch); otherwise
  // restore the last-used workspace for this account; else primary.
  const stored = readLastActiveRole(userId);
  const activeRole =
    user.activeRole && held.includes(user.activeRole)
      ? user.activeRole
      : stored && held.includes(stored)
        ? stored
        : user.platformRole;
  return {
    userId,
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    additionalRoles: extras,
    activeRole,
    institute: user.institute,
    department: user.department,
    phone: user.phone,
    accessToken: user.accessToken,
    linkedinUrl: user.linkedinUrl ?? null,
    profileJson: user.profileJson ?? undefined,
    mustChangePassword: user.mustChangePassword === true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const refreshed = useRef(false);

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthEntry =
    (pathname.startsWith("/login") && !pathname.startsWith("/login/forgot")) ||
    pathname.startsWith("/register");

  useLayoutEffect(() => {
    // Credentials / invite emails use ?switch=1 so an existing browser session does not
    // immediately bounce the recipient away from the sign-in form.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("switch") === "1" || params.get("logout") === "1") {
        clearApiCache();
        clearSession();
        setAccessToken(null);
        setSession(null);
        params.delete("switch");
        params.delete("logout");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
        setReady(true);
        return;
      }
    }

    const cached = readSession();
    if (cached?.userId) {
      setSession(cached);
      if (cached.accessToken) setAccessToken(cached.accessToken);
    }
    setReady(true);
  }, []);

  const refreshMe = useCallback(async () => {
    const cached = readSession();
    if (!cached?.accessToken) return;
    setAccessToken(cached.accessToken);
    const me = await api<{
      id: string;
      email: string;
      fullName: string;
      platformRole: PlatformRole;
      additionalRoles?: PlatformRole[] | null;
      institute?: string | null;
      department?: string | null;
      phone?: string | null;
      linkedinUrl?: string | null;
      profileJson?: Record<string, unknown> | null;
      mustChangePassword?: boolean;
    }>("/me");
    const next = toSession({ ...me, userId: me.id, accessToken: cached.accessToken, profileJson: me.profileJson });
    writeSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!ready || refreshed.current) return;
    refreshed.current = true;
    const cached = readSession();
    if (!cached?.accessToken) return;
    void refreshMe().catch(() => {
      /* keep cached session on transient errors */
    });
  }, [ready, refreshMe]);

  useEffect(() => {
    if (!ready) return;
    if (!session && isDashboard) {
      router.replace("/login");
    }
  }, [ready, session, isDashboard, pathname, router]);

  useEffect(() => {
    if (!ready || !isAuthEntry) return;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("switch") === "1" || params.get("logout") === "1") {
        clearApiCache();
        clearSession();
        setAccessToken(null);
        setSession(null);
        params.delete("switch");
        params.delete("logout");
        const next = `${pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
        return;
      }
    }

    if (!session) return;
    if (session.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(landingForLogin(session));
  }, [ready, session, isAuthEntry, pathname, router]);

  // Admin-issued password: nothing else is usable until the user picks their own.
  useEffect(() => {
    if (!ready || !session?.mustChangePassword) return;
    if (pathname !== "/change-password") router.replace("/change-password");
  }, [ready, session?.mustChangePassword, pathname, router]);

  const establishSession = useCallback(
    (payload: {
      accessToken: string;
      userId: string;
      email: string;
      fullName: string;
      platformRole: PlatformRole;
      additionalRoles?: PlatformRole[] | null;
      activeRole?: PlatformRole | null;
      institute?: string | null;
      department?: string | null;
      phone?: string | null;
      profileJson?: Record<string, unknown> | null;
      mustChangePassword?: boolean;
    }) => {
      const next = toSession(payload);
      clearApiCache();
      writeSession(next);
      writeLastActiveRole(next.userId, next.activeRole);
      setAccessToken(payload.accessToken);
      setSession(next);
    },
    [],
  );

  /** Persist a workspace change. Returns the resulting role, or null when nothing changed. */
  const applyActiveRole = useCallback(async (role: PlatformRole): Promise<PlatformRole | null> => {
    const cached = readSession();
    if (!cached?.userId || !cached?.accessToken) return null;
    if (!allRoles(cached).includes(role)) return null;
    // Persist server-side (cross-device memory + audit attribution); the
    // response carries a fresh token bound to the chosen workspace.
    setAccessToken(cached.accessToken);
    try {
      const res = await apiPost<ActiveRoleResponse>("/me/active-role", { role });
      const next = toSession({ ...res, accessToken: res.accessToken });
      clearApiCache();
      writeSession(next);
      writeLastActiveRole(next.userId, next.activeRole);
      setAccessToken(next.accessToken ?? null);
      setSession(next);
      return next.activeRole;
    } catch (err) {
      // The server answered and refused (4xx/5xx): do not switch locally.
      if (err instanceof ApiError) throw err;
      // Network error / offline: flip workspace locally; server syncs on next refresh.
      const next: Session = { ...cached, activeRole: role };
      writeSession(next);
      writeLastActiveRole(next.userId, role);
      setSession(next);
      return role;
    }
  }, []);

  const switchRole = useCallback(
    async (role: PlatformRole) => {
      const applied = await applyActiveRole(role);
      if (applied) window.location.assign(dashboardForRole(applied));
    },
    [applyActiveRole],
  );

  const syncActiveRole = useCallback(
    async (role: PlatformRole) => {
      await applyActiveRole(role);
    },
    [applyActiveRole],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      establishSession,
      logout: () => {
        wipeClientSession();
        setSession(null);
        window.location.assign("/login");
      },
      refreshMe,
      switchRole,
      syncActiveRole,
    }),
    [session, ready, establishSession, refreshMe, switchRole, syncActiveRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function roleLabel(role: PlatformRole) {
  if (role === "admin") return "Admin";
  if (role === "institute_mentor") return "Institute Mentor";
  if (role === "industry_mentor") return "Industry Mentor";
  if (role === "student_expert") return "Student Expert";
  return "Student";
}

export const initialsFrom = initials;
