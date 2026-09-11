"use client";

import { useEffect } from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/nextjs";
import { setClerkToken } from "../../lib/auth-token";
import { CLERK_PUBLISHABLE_KEY } from "../../lib/config";
import { AuthProvider } from "./AuthProvider";

function ClerkTokenSync() {
  const { getToken, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setClerkToken(null);
      return;
    }
    const refresh = () => {
      void getToken().then((token) => setClerkToken(token ?? null));
    };
    refresh();
    const id = window.setInterval(refresh, 50_000);
    return () => window.clearInterval(id);
  }, [getToken, isSignedIn]);

  return null;
}

export default function AuthProviders({ children }: { children: React.ReactNode }) {
  const inner = (
    <AuthProvider>
      {CLERK_PUBLISHABLE_KEY ? <ClerkTokenSync /> : null}
      {children}
    </AuthProvider>
  );

  if (!CLERK_PUBLISHABLE_KEY) return inner;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      {inner}
    </ClerkProvider>
  );
}
