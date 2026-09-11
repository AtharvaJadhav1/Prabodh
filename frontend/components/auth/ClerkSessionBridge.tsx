"use client";

import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { api, ApiError } from "../../lib/api";
import { setClerkToken } from "../../lib/auth-token";
import { clearSession, writeSession, type PlatformRole, type Session } from "../../lib/session";

type Props = {
  onSession: (session: Session | null) => void;
  onClerkState: (state: { loaded: boolean; signedIn: boolean }) => void;
  onSyncFailed: (message: string | null) => void;
  registerSignOut: (signOut: (() => Promise<void>) | null) => void;
};

function toSession(user: {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
}): Session {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    platformRole: user.platformRole,
    institute: user.institute,
    department: user.department,
    phone: user.phone,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMe(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const token = await getToken(attempt > 0 ? { skipCache: true } : undefined);
      setClerkToken(token ?? null);
      if (!token) {
        lastErr = new ApiError(401, "Missing Clerk token");
        await sleep(300 * (attempt + 1));
        continue;
      }
      const me = await api<{
        id: string;
        email: string;
        fullName: string;
        platformRole: PlatformRole;
        institute?: string | null;
        department?: string | null;
        phone?: string | null;
      }>("/me");
      return toSession(me);
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403) && attempt < 7) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export default function ClerkSessionBridge({
  onSession,
  onClerkState,
  onSyncFailed,
  registerSignOut,
}: Props) {
  const { isSignedIn, isLoaded, userId, getToken, signOut } = useClerkAuth();
  const syncing = useRef(false);
  const synced = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    onClerkState({ loaded: isLoaded, signedIn: Boolean(isSignedIn) });
  }, [isLoaded, isSignedIn, onClerkState]);

  useEffect(() => {
    registerSignOut(signOut);
    return () => registerSignOut(null);
  }, [registerSignOut, signOut]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      synced.current = null;
      setClerkToken(null);
      clearSession();
      onSyncFailed(null);
      onSession(null);
      return;
    }

    if (synced.current === userId || syncing.current) return;
    syncing.current = true;
    onSyncFailed(null);

    void (async () => {
      try {
        const next = await fetchMe((opts) => getTokenRef.current(opts));
        synced.current = userId;
        writeSession(next);
        onSession(next);
      } catch (err) {
        synced.current = null;
        onSession(null);
        onSyncFailed(err instanceof Error ? err.message : "Could not sync your account");
      } finally {
        syncing.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, userId, onSession, onSyncFailed]);

  useEffect(() => {
    if (!isSignedIn) return;
    void getTokenRef.current().then((t) => setClerkToken(t ?? null));
    const id = window.setInterval(() => {
      void getTokenRef.current().then((t) => setClerkToken(t ?? null));
    }, 45_000);
    return () => window.clearInterval(id);
  }, [isSignedIn, userId]);

  return null;
}
