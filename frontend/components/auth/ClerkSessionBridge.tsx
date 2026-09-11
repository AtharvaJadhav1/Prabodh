"use client";

import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setClerkToken } from "../../lib/auth-token";
import {
  clearSession,
  dashboardForRole,
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

export default function ClerkSessionBridge({ onSession, onClerkState, registerSignOut }: Props) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const router = useRouter();
  const pathname = usePathname();
  const syncing = useRef(false);

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
      setClerkToken(null);
      clearSession();
      onSession(null);
      return;
    }

    if (syncing.current) return;
    syncing.current = true;

    void (async () => {
      try {
        const token = await getToken();
        setClerkToken(token ?? null);
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
        onSession(next);

        if (pathname.startsWith("/login")) {
          router.replace(dashboardForRole(next.platformRole));
        }
      } catch {
        setClerkToken(null);
        clearSession();
        onSession(null);
        await signOut();
      } finally {
        syncing.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, getToken, onSession, pathname, router, signOut]);

  useEffect(() => {
    if (!isSignedIn) return;
    const id = window.setInterval(() => {
      void getToken().then((token) => setClerkToken(token ?? null));
    }, 50_000);
    return () => window.clearInterval(id);
  }, [isSignedIn, getToken]);

  return null;
}
