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
import { api, apiPost } from "../../lib/api";
import { setAccessToken } from "../../lib/auth-token";
import { clearApiCache } from "../../lib/api-cache";
import {
  allRoles,
  clearSession,
  dashboardForRole,
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
  }) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  /** Switch a dual-role account to another held workspace (persists + redirects). */
  switchRole: (role: PlatformRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
  profileJson?: Record<string, unknown> | null;
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
    profileJson: user.profileJson ?? undefined,
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
      profileJson?: Record<string, unknown> | null;
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
    router.replace(dashboardForRole(session.activeRole ?? session.platformRole));
  }, [ready, session, isAuthEntry, pathname, router]);

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

  const switchRole = useCallback(async (role: PlatformRole) => {
    const cached = readSession();
    if (!cached?.userId || !cached?.accessToken) return;
    if (!allRoles(cached).includes(role)) return;
    // Persist server-side (cross-device memory + audit attribution); the
    // response carries a fresh token bound to the chosen workspace.
    setAccessToken(cached.accessToken);
    try {
      const res = await apiPost<{
        accessToken: string;
        userId: string;
        email: string;
        fullName: string;
        platformRole: PlatformRole;
        additionalRoles?: PlatformRole[] | null;
        activeRole?: PlatformRole | null;
      }>("/me/active-role", { role });
      const next = toSession({ ...res, accessToken: res.accessToken });
      clearApiCache();
      writeSession(next);
      writeLastActiveRole(next.userId, next.activeRole);
      setAccessToken(next.accessToken ?? null);
      setSession(next);
      window.location.assign(dashboardForRole(next.activeRole));
    } catch {
      // Offline fallback: flip workspace locally; server syncs on next refresh.
      const next: Session = { ...cached, activeRole: role };
      writeSession(next);
      writeLastActiveRole(next.userId, role);
      setSession(next);
      window.location.assign(dashboardForRole(role));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      establishSession,
      logout: () => {
        clearApiCache();
        clearSession();
        setAccessToken(null);
        setSession(null);
        window.location.assign("/login");
      },
      refreshMe,
      switchRole,
    }),
    [session, ready, establishSession, refreshMe, switchRole],
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

export function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
