"use client";

import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { api, ApiError } from "../../lib/api";
import { setClerkToken } from "../../lib/auth-token";
import {
  clearSession,
  readSession,
  writeSession,
  type PlatformRole,
  type Session,
} from "../../lib/session";

type Props = {
  onSession: (session: Session | null) => void;
  onClerkState: (state: { loaded: boolean; signedIn: boolean }) => void;
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

async function fetchMeWithRetry(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>,
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const token = await getToken(attempt > 0 ? { skipCache: true } : undefined);
      setClerkToken(token ?? null);
      if (!token) {
        lastErr = new ApiError(401, "Missing Clerk token");
        await sleep(250 * (attempt + 1));
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
      if (err instanceof ApiError && (err.status === 401 || err.status === 403) && attempt < 5) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export default function ClerkSessionBridge({ onSession, onClerkState, registerSignOut }: Props) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const syncing = useRef(false);
  const syncedUserId = useRef<string | null>(null);
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

    if (!isSignedIn) {
      const timer = window.setTimeout(() => {
        syncedUserId.current = null;
        setClerkToken(null);
        clearSession();
        onSession(null);
      }, 800);
      return () => window.clearTimeout(timer);
    }

    const cached = readSession();
    if (cached?.userId && cached.userId === syncedUserId.current) {
      onSession(cached);
      return;
    }

    if (syncing.current) return;
    syncing.current = true;

    void (async () => {
      try {
        const next = await fetchMeWithRetry((opts) => getTokenRef.current(opts));
        syncedUserId.current = next.userId;
        writeSession(next);
        onSession(next);
      } catch {
        const cachedSession = readSession();
        if (cachedSession?.userId) {
          onSession(cachedSession);
          syncedUserId.current = cachedSession.userId;
          return;
        }
        syncedUserId.current = null;
      } finally {
        syncing.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, onSession]);

  useEffect(() => {
    if (!isSignedIn) return;
    const id = window.setInterval(() => {
      void getTokenRef.current().then((token) => setClerkToken(token ?? null));
    }, 50_000);
    return () => window.clearInterval(id);
  }, [isSignedIn]);

  return null;
}
