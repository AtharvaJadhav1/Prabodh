"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import { dashboardForRole } from "../../../lib/session";

function safeNext(path: string | null) {
  if (!path || !path.startsWith("/dashboard")) return null;
  if (path.includes("://") || path.includes("//")) return null;
  return path;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { session, clerkEnabled, syncError, refreshMe } = useAuth();
  const sent = useRef(false);
  const [status, setStatus] = useState("Confirming your session…");

  useEffect(() => {
    if (sent.current) return;
    if (!clerkEnabled) {
      sent.current = true;
      router.replace("/login/student");
      return;
    }
    if (!isLoaded) return;

    const next = safeNext(searchParams.get("next"));

    if (!isSignedIn) {
      setStatus("Finishing Clerk sign-in…");
      return;
    }

    if (syncError) {
      setStatus("Signed in — syncing profile…");
      const t = window.setTimeout(() => void refreshMe(), 800);
      return () => window.clearTimeout(t);
    }

    if (!session) {
      setStatus("Loading your profile…");
      return;
    }

    sent.current = true;
    setStatus("Opening your dashboard…");
    router.replace(next ?? dashboardForRole(session.platformRole));
  }, [clerkEnabled, isLoaded, isSignedIn, session, syncError, searchParams, router, refreshMe]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-canvas px-4 text-center">
      <p className="text-sm font-medium text-brand-muted">{status}</p>
      {isLoaded && isSignedIn && syncError ? (
        <button
          type="button"
          onClick={() => void refreshMe()}
          className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Retry
        </button>
      ) : null}
      {isLoaded && !isSignedIn ? (
        <a
          href="/login/student"
          className="rounded-xl border border-brand-sand px-5 py-2.5 text-sm font-semibold text-brand-deep hover:border-brand-primary/40"
        >
          Back to login
        </a>
      ) : null}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
          Finishing sign-in…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
