"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setAccessToken } from "../../lib/auth-token";
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthEntry = pathname.startsWith("/login") || pathname.startsWith("/register");

  useEffect(() => {
    const cached = readSession();
    if (cached?.userId) {
      setSession(cached);
      if (cached.accessToken) setAccessToken(cached.accessToken);
    }
    setReady(true);
  }, []);

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
    }) => {
      const next = toSession(payload);
      writeSession(next);
      setAccessToken(payload.accessToken);
      setSession(next);
    },
    [],
  );

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
    }>("/me");
    const next = toSession({ ...me, userId: me.id, accessToken: cached.accessToken });
    writeSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session && isDashboard) router.replace("/login/student");
    if (session && isAuthEntry) router.replace(dashboardForRole(session.platformRole));
  }, [ready, session, isDashboard, isAuthEntry, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      establishSession,
      logout: () => {
        clearSession();
        setAccessToken(null);
        setSession(null);
        window.location.assign("/login/student");
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
