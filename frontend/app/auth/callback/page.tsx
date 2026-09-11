"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import { dashboardForRole } from "../../../lib/session";

/**
 * Public post-login landing. Waits for Clerk handshake + /me before /dashboard.
 * Must NOT redirect to login while __clerk_handshake is still settling.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { session, syncing, clerkEnabled, syncError } = useAuth();
  const sent = useRef(false);
  const [waitedOut, setWaitedOut] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setWaitedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (sent.current) return;

    if (!clerkEnabled) {
      sent.current = true;
      router.replace("/login/student");
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      // Clerk often lands here with ?__clerk_handshake=... before cookies exist.
      if (!waitedOut) return;
      sent.current = true;
      router.replace("/login/student");
      return;
    }

    if (syncing || !session) {
      if (waitedOut) {
        sent.current = true;
        router.replace("/dashboard/student");
      }
      return;
    }

    sent.current = true;
    router.replace(dashboardForRole(session.platformRole));
  }, [clerkEnabled, isLoaded, isSignedIn, session, syncing, router, waitedOut]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-canvas px-4 text-center">
      <p className="text-sm font-medium text-brand-muted">Finishing sign-in…</p>
      <p className="text-xs text-brand-charcoal/60">
        {isSignedIn ? "Loading your profile…" : "Confirming your Clerk session…"}
      </p>
      {syncError ? <p className="max-w-md text-sm text-red-700">{syncError}</p> : null}
    </div>
  );
}
