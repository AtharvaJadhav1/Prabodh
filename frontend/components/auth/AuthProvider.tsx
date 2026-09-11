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
  syncing: boolean;
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

  const syncing = clerkEnabled && clerkState.signedIn && !session;

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
      if (
        current?.userId === next.userId &&
        current?.email === next.email &&
        current?.fullName === next.fullName &&
        current?.platformRole === next.platformRole
      ) {
        return;
      }
      writeSession(next);
      setSession(next);
    } catch {
      /* keep cached session if API is unreachable */
    }
  }, [clerkState.signedIn]);

  useEffect(() => {
    const cached = readSession();
    if (cached?.userId) {
      setSession(cached);
    }
    setReady(true);
  }, [clerkEnabled]);

  useEffect(() => {
    if (!ready || clerkEnabled) return;
    const current = readSession();
    if (!current?.userId) return;
    void refreshMe();
  }, [ready, clerkEnabled, refreshMe]);

  useEffect(() => {
    if (!ready) return;
    const isPublic = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register");

    if (clerkEnabled) {
      if (!clerkState.loaded || syncing) return;
      if (!clerkState.signedIn && !session && pathname.startsWith("/dashboard")) {
        router.replace("/login/student");
      }
      if (clerkState.signedIn && session && isPublic) {
        router.replace(dashboardForRole(session.platformRole));
      }
      return;
    }

    if (!session && pathname.startsWith("/dashboard")) {
      router.replace("/login/student");
    }
    if (session && isPublic) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, pathname, router, clerkEnabled, clerkState, syncing]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready: ready && (!clerkEnabled || clerkState.loaded),
      syncing,
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
    [session, ready, syncing, clerkEnabled, clerkState, clerkSignOut, router, refreshMe],
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
      {syncing ? (
        <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
          Syncing your session…
        </div>
      ) : (
        children
      )}
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
