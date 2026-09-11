"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { CLERK_PUBLISHABLE_KEY, CLERK_SIGN_IN_REDIRECT, CLERK_SIGN_UP_REDIRECT } from "../../lib/config";
import { AuthProvider } from "./AuthProvider";

export default function AuthProviders({ children }: { children: React.ReactNode }) {
  const inner = <AuthProvider>{children}</AuthProvider>;

  if (!CLERK_PUBLISHABLE_KEY) return inner;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login/student"
      signUpUrl="/register"
      afterSignOutUrl="/login/student"
      signInFallbackRedirectUrl={CLERK_SIGN_IN_REDIRECT}
      signUpFallbackRedirectUrl={CLERK_SIGN_UP_REDIRECT}
    >
      {inner}
    </ClerkProvider>
  );
}
