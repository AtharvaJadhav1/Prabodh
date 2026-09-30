"use client";

import { useEffect } from "react";

/** Legacy auth callback URL — redirects to the login page. */
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
