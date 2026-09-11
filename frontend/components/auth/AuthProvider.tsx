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
import { api, apiPost } from "../../lib/api";
import { CLERK_PUBLISHABLE_KEY } from "../../lib/config";
import {
  clearSession,
  dashboardForRole,
  readSession,
  writeSession,
  type PlatformRole,
  type Session,
} from "../../lib/session";
import ClerkSessionBridge from "./ClerkSessionBridge";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  clerkEnabled: boolean;
  login: (email: string) => Promise<Session>;
  logout: () => Promise<void>;
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
  const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [clerkState, setClerkState] = useState({ loaded: !clerkEnabled, signedIn: false });
  const [clerkSignOut, setClerkSignOut] = useState<(() => Promise<void>) | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const refreshMe = useCallback(async () => {
    const current = readSession();
    if (!current?.userId && !clerkState.signedIn) return;
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
      const next = { ...(current ?? {}), ...toSession(me) } as Session;
      writeSession(next);
      setSession(next);
    } catch {
      /* keep cached session if API is unreachable */
    }
  }, [clerkState.signedIn]);

  useEffect(() => {
    if (!clerkEnabled) {
      setSession(readSession());
    }
    setReady(true);
  }, [clerkEnabled]);

  useEffect(() => {
    if (!ready || !session || clerkEnabled) return;
    void refreshMe();
  }, [ready, session, clerkEnabled, refreshMe]);

  useEffect(() => {
    if (!ready) return;
    const isPublic = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register");

    if (clerkEnabled) {
      if (!clerkState.loaded) return;
      if (!clerkState.signedIn && pathname.startsWith("/dashboard")) {
        router.replace("/login/student");
      }
      if (clerkState.signedIn && session && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
        router.replace(dashboardForRole(session.platformRole));
      }
      return;
    }

    if (!session && pathname.startsWith("/dashboard")) {
      router.replace("/login/student");
    }
    if (session && isPublic && pathname.startsWith("/login")) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, pathname, router, clerkEnabled, clerkState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready: ready && (!clerkEnabled || clerkState.loaded),
      clerkEnabled,
      login: async (email: string) => {
        const user = await apiPost<Session>("/auth/dev-login", { email });
        writeSession(user);
        setSession(user);
        return user;
      },
      logout: async () => {
        clearSession();
        setSession(null);
        if (clerkEnabled && clerkSignOut) {
          await clerkSignOut();
        }
        router.push("/");
      },
      refreshMe,
    }),
    [session, ready, clerkEnabled, clerkState, clerkSignOut, router, refreshMe],
  );

  return (
    <AuthContext.Provider value={value}>
      {clerkEnabled ? (
        <ClerkSessionBridge
          onSession={setSession}
          onClerkState={setClerkState}
          registerSignOut={setClerkSignOut}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  );
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
