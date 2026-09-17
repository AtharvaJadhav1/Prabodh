"use client";

import { useEffect } from "react";

/** Legacy Clerk callback — redirect to login. */
export default function AuthCallbackPage() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-canvas text-sm font-medium text-brand-muted">
      Redirecting to sign in…
    </div>
  );
}
