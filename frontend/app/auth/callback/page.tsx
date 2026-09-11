"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../components/auth/AuthProvider";
import { dashboardForRole } from "../../../lib/session";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { session, clerkEnabled } = useAuth();
  const sent = useRef(false);
  const reloaded = useRef(false);
  const [status, setStatus] = useState("Confirming your session…");

  useEffect(() => {
    if (sent.current) return;
    if (!clerkEnabled) {
      sent.current = true;
      router.replace("/login/student");
      return;
    }
    if (!isLoaded) return;

    const hasHandshake = Boolean(searchParams.get("__clerk_handshake"));

    if (!isSignedIn) {
      if (hasHandshake && !reloaded.current) {
        reloaded.current = true;
        setStatus("Securing your session…");
        const t = window.setTimeout(() => {
          window.location.replace("/auth/callback");
        }, 800);
        return () => window.clearTimeout(t);
      }

      setStatus("Waiting for Clerk…");
      const t = window.setTimeout(() => {
        if (sent.current) return;
        setStatus("Still waiting — use Back to login if this hangs.");
      }, 8000);
      return () => window.clearTimeout(t);
    }

    sent.current = true;
    router.replace(session ? dashboardForRole(session.platformRole) : "/dashboard/student");
  }, [clerkEnabled, isLoaded, isSignedIn, session, router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-canvas px-4 text-center">
      <p className="text-sm font-medium text-brand-muted">{status}</p>
      {isLoaded && !isSignedIn ? (
        <button
          type="button"
          onClick={() => {
            sent.current = true;
            router.replace("/login/student");
          }}
          className="rounded-xl border border-brand-sand px-5 py-2.5 text-sm font-semibold text-brand-deep hover:border-brand-primary/40"
        >
          Back to login
        </button>
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
