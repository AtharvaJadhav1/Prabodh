"use client";

import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "../../../components/auth/AuthProvider";
import { dashboardForRole } from "../../../lib/session";
import { useRouter } from "next/navigation";

/**
 * Public post-login landing. Waits until Clerk cookies + /me profile are ready
 * before entering /dashboard (avoids middleware kicking you back to login).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { session, syncing, clerkEnabled } = useAuth();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;

    if (!clerkEnabled) {
      sent.current = true;
      router.replace("/login/student");
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      sent.current = true;
      router.replace("/login/student");
      return;
    }

    if (syncing || !session) return;

    sent.current = true;
    router.replace(dashboardForRole(session.platformRole));
  }, [clerkEnabled, isLoaded, isSignedIn, session, syncing, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-canvas px-4 text-center">
      <p className="text-sm font-medium text-brand-muted">Finishing sign-in…</p>
      <p className="text-xs text-brand-charcoal/60">Preparing your dashboard</p>
    </div>
  );
}
