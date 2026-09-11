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
  syncError: string | null;
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
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetry, setSyncRetry] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname.startsWith("/dashboard");
  const isCallback = pathname.startsWith("/auth/callback");
  const isAuthEntry =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const syncing =
    clerkEnabled &&
    clerkState.signedIn &&
    (isDashboard || isCallback) &&
    !session &&
    !syncError;

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
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Could not sync your account");
    }
  }, [clerkState.signedIn]);

  useEffect(() => {
    const cached = readSession();
    if (cached?.userId) setSession(cached);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || clerkEnabled) return;
    if (!readSession()?.userId) return;
    void refreshMe();
  }, [ready, clerkEnabled, refreshMe]);

  // Signed-in users on login/register → dashboard (hard nav).
  useEffect(() => {
    if (!ready || !clerkEnabled) return;
    if (!clerkState.loaded || !clerkState.signedIn || !session) return;
    if (!isAuthEntry) return;
    window.location.assign(dashboardForRole(session.platformRole));
  }, [ready, clerkEnabled, clerkState, session, isAuthEntry]);

  // Client-only dashboard gate (middleware no longer redirects — that raced cookies).
  useEffect(() => {
    if (!ready || !clerkEnabled || !isDashboard) return;
    if (!clerkState.loaded) return;
    if (clerkState.signedIn) return;
    // Allow a short grace for hydration; then require login.
    const t = window.setTimeout(() => {
      if (!readSession()?.userId) {
        window.location.replace("/login/student");
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [ready, clerkEnabled, isDashboard, clerkState]);

  // Dev-auth only.
  useEffect(() => {
    if (!ready || clerkEnabled) return;
    if (!session && isDashboard) router.replace("/login/student");
    if (session && isAuthEntry) router.replace(dashboardForRole(session.platformRole));
  }, [ready, clerkEnabled, session, isDashboard, isAuthEntry, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready: ready && (!clerkEnabled || clerkState.loaded),
      syncing,
      syncError,
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
        if (clerkEnabled && clerkSignOut) await clerkSignOut();
        window.location.assign("/login/student");
      },
      refreshMe,
    }),
    [session, ready, syncing, syncError, clerkEnabled, clerkState, clerkSignOut, refreshMe],
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
      {syncing && isDashboard ? (
        <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
          Syncing your session…
        </div>
      ) : syncError && isDashboard ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-canvas px-4 text-center">
          <p className="text-sm font-medium text-brand-muted">Could not load your profile from the API.</p>
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
      ) : !clerkEnabled || !isDashboard || clerkState.signedIn || session ? (
        children
      ) : (
        <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
          Checking sign-in…
        </div>
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
