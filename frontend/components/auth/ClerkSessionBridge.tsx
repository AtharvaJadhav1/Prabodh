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

async function fetchMe(getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>) {
  const token = await getToken();
  setClerkToken(token ?? null);
  if (!token) throw new ApiError(401, "Missing Clerk token");
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
}

export default function ClerkSessionBridge({ onSession, onClerkState, registerSignOut }: Props) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const syncing = useRef(false);
  const syncedUserId = useRef<string | null>(null);

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
      syncedUserId.current = null;
      setClerkToken(null);
      clearSession();
      onSession(null);
      return;
    }

    if (syncing.current) return;
    syncing.current = true;

    void (async () => {
      try {
        let next: Session;
        try {
          next = await fetchMe(getToken);
        } catch (firstErr) {
          if (firstErr instanceof ApiError && (firstErr.status === 401 || firstErr.status === 403)) {
            throw firstErr;
          }
          try {
            next = await fetchMe((opts) => getToken(opts));
          } catch {
            const cached = readSession();
            if (cached?.userId) {
              onSession(cached);
              return;
            }
            throw firstErr;
          }
        }
        syncedUserId.current = next.userId;
        writeSession(next);
        onSession(next);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          syncedUserId.current = null;
          setClerkToken(null);
          clearSession();
          onSession(null);
          await signOut();
          return;
        }
        const cached = readSession();
        if (cached?.userId) {
          onSession(cached);
        }
      } finally {
        syncing.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, getToken, onSession, signOut]);

  useEffect(() => {
    if (!isSignedIn) return;
    const id = window.setInterval(() => {
      void getToken().then((token) => setClerkToken(token ?? null));
    }, 50_000);
    return () => window.clearInterval(id);
  }, [isSignedIn, getToken]);

  return null;
}
