"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, apiPost } from "../../lib/api";
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
  login: (email: string) => Promise<Session>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
}): Session {
  return {
    userId: user.userId ?? user.id ?? "",
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    institute: user.institute,
    department: user.department,
    phone: user.phone,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refreshMe = async () => {
    const current = readSession();
    if (!current?.userId) return;
    try {
      const me = await api<{
        id: string;
        email: string;
        fullName: string;
        platformRole: PlatformRole;
        institute?: string | null;
        department?: string | null;
        phone?: string | null;
      }>("/me");
      const next = { ...current, ...toSession(me) };
      writeSession(next);
      setSession(next);
    } catch {
      /* keep cached session if API is unreachable */
    }
  };

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !session) return;
    void refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const isPublic = pathname === "/" || pathname.startsWith("/login");
    if (!session && pathname.startsWith("/dashboard")) {
      router.replace("/login/student");
    }
    if (session && isPublic && pathname.startsWith("/login")) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, pathname, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      login: async (email: string) => {
        const user = await apiPost<Session>("/auth/dev-login", { email });
        writeSession(user);
        setSession(user);
        return user;
      },
      logout: () => {
        clearSession();
        setSession(null);
        router.push("/");
      },
      refreshMe,
    }),
    [session, ready, router],
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
