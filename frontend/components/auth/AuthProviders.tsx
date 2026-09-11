"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { AUTH_CALLBACK, CLERK_PUBLISHABLE_KEY } from "../../lib/config";
import { AuthProvider } from "./AuthProvider";

export default function AuthProviders({ children }: { children: React.ReactNode }) {
  const inner = <AuthProvider>{children}</AuthProvider>;

  if (!CLERK_PUBLISHABLE_KEY) return inner;

  // Relative URLs only — absolute URLs + Render localhost broke Clerk cookies before.
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login/student"
      signUpUrl="/register"
      afterSignOutUrl="/login/student"
      signInFallbackRedirectUrl={AUTH_CALLBACK}
      signUpFallbackRedirectUrl={AUTH_CALLBACK}
      signInForceRedirectUrl={AUTH_CALLBACK}
      signUpForceRedirectUrl={AUTH_CALLBACK}
    >
      {inner}
    </ClerkProvider>
  );
}
