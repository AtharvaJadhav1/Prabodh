"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import { dashboardForRole } from "../../../lib/session";

function safeNext(path: string | null) {
  if (!path || !path.startsWith("/dashboard")) return null;
  if (path.includes("://") || path.includes("//")) return null;
  return path;
}

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { session, clerkEnabled, syncError } = useAuth();
  const sent = useRef(false);
  const reloaded = useRef(false);
  const [status, setStatus] = useState("Confirming your session…");
  const [canBail, setCanBail] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setCanBail(true), 12_000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (sent.current) return;
    if (!clerkEnabled) {
      sent.current = true;
      window.location.replace("/login/student");
      return;
    }
    if (!isLoaded) return;

    const hasHandshake = Boolean(searchParams.get("__clerk_handshake"));
    const next = safeNext(searchParams.get("next"));

    if (!isSignedIn) {
      if (hasHandshake && !reloaded.current) {
        reloaded.current = true;
        setStatus("Securing your session…");
        const t = window.setTimeout(() => {
          // Drop handshake token from URL and let Clerk finish cookies.
          window.location.replace(next ? `/auth/callback?next=${encodeURIComponent(next)}` : "/auth/callback");
        }, 900);
        return () => window.clearTimeout(t);
      }

      setStatus("Waiting for Clerk to finish sign-in…");
      return;
    }

    if (syncError) {
      setStatus(`Signed in, but profile sync failed: ${syncError}`);
      return;
    }

    if (!session) {
      setStatus("Loading your profile…");
      return;
    }

    sent.current = true;
    setStatus("Opening your dashboard…");
    const dest = next ?? dashboardForRole(session.platformRole);
    // Hard navigation so the session cookie is always sent to middleware.
    window.location.assign(dest);
  }, [clerkEnabled, isLoaded, isSignedIn, session, syncError, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-canvas px-4 text-center">
      <p className="text-sm font-medium text-brand-muted">{status}</p>
      {(canBail && isLoaded && !isSignedIn) || syncError ? (
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
