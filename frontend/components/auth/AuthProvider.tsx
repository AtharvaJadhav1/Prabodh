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
import { api } from "../../lib/api";
import { setAccessToken } from "../../lib/auth-token";
import { clearApiCache } from "../../lib/api-cache";
import {
  clearSession,
  dashboardForRole,
  readSession,
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
    institute?: string | null;
    department?: string | null;
    phone?: string | null;
    profileJson?: Record<string, unknown> | null;
  }) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: {
  userId?: string;
  id?: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  accessToken?: string;
  profileJson?: Record<string, unknown> | null;
}): Session {
  return {
    userId: user.userId ?? user.id ?? "",
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
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
    router.replace(dashboardForRole(session.platformRole));
  }, [ready, session, isAuthEntry, pathname, router]);

  const establishSession = useCallback(
    (payload: {
      accessToken: string;
      userId: string;
      email: string;
      fullName: string;
      platformRole: PlatformRole;
      institute?: string | null;
      department?: string | null;
      phone?: string | null;
      profileJson?: Record<string, unknown> | null;
    }) => {
      const next = toSession(payload);
      clearApiCache();
      writeSession(next);
      setAccessToken(payload.accessToken);
      setSession(next);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      establishSession,
      logout: () => {
        const role = session?.platformRole;
        clearApiCache();
        clearSession();
        setAccessToken(null);
        setSession(null);
        window.location.assign("/login");
      },
      refreshMe,
    }),
    [session, ready, establishSession, refreshMe],
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
