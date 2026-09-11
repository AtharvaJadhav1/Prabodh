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

function AuthLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
      {label}
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [clerkState, setClerkState] = useState({ loaded: !clerkEnabled, signedIn: false });
  const [clerkSignOut, setClerkSignOut] = useState<(() => Promise<void>) | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetry, setSyncRetry] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname.startsWith("/dashboard");
  const isCallback = pathname.startsWith("/auth/callback");
  const isPublic =
    pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register");

  const clerkBooting = clerkEnabled && !clerkState.loaded;
  const needsProfile = isDashboard || isCallback;
  const syncingProfile = clerkEnabled && clerkState.signedIn && needsProfile && !session;
  const showAuthLoading = clerkBooting || (syncingProfile && !syncError && isDashboard);

  const refreshMe = useCallback(async () => {
    if (!clerkState.signedIn && !readSession()?.userId) return;
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
      const next = toSession(me);
      writeSession(next);
      setSession(next);
    } catch {
      /* keep current session on refresh failure */
    }
  }, [clerkState.signedIn]);

  useEffect(() => {
    if (!clerkEnabled) {
      setSession(readSession());
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
    if (!ready || !clerkEnabled) return;
    if (!clerkState.loaded || showAuthLoading) return;

    if (clerkState.signedIn && session && isPublic) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, pathname, router, clerkEnabled, clerkState, isPublic, showAuthLoading]);

  useEffect(() => {
    if (!ready || clerkEnabled) return;

    if (!session && isDashboard) {
      router.replace("/login/student");
      return;
    }
    if (session && isPublic) {
      router.replace(dashboardForRole(session.platformRole));
    }
  }, [ready, session, pathname, router, clerkEnabled, isDashboard, isPublic]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready: ready && (!clerkEnabled || clerkState.loaded),
      syncing: syncingProfile,
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
        router.push("/login/student");
      },
      refreshMe,
    }),
    [session, ready, syncingProfile, clerkEnabled, clerkState, clerkSignOut, router, refreshMe],
  );

  return (
    <AuthContext.Provider value={value}>
      {clerkEnabled ? (
        <ClerkSessionBridge
          key={syncRetry}
          onSession={setSession}
          onClerkState={setClerkState}
          onSyncFailed={setSyncError}
          registerSignOut={setClerkSignOut}
        />
      ) : null}
      {showAuthLoading ? (
        <AuthLoading label={clerkBooting ? "Loading…" : "Syncing your session…"} />
      ) : syncError && (isDashboard || isCallback) ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-canvas px-4 text-center">
          <p className="text-sm font-medium text-brand-muted">Signed in, but we could not load your profile.</p>
          <p className="max-w-md text-sm text-red-700">{syncError}</p>
          <button
            type="button"
            onClick={() => {
              setSyncError(null);
              setSyncRetry((n) => n + 1);
            }}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Retry
          </button>
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
