"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { absoluteAuthCallback, CLERK_PUBLISHABLE_KEY, publicAppUrl } from "../../lib/config";
import { AuthProvider } from "./AuthProvider";

export default function AuthProviders({ children }: { children: React.ReactNode }) {
  const inner = <AuthProvider>{children}</AuthProvider>;

  if (!CLERK_PUBLISHABLE_KEY) return inner;

  const appUrl = publicAppUrl();
  const callback = absoluteAuthCallback();

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl="/login/student"
      signUpUrl="/register"
      afterSignOutUrl="/login/student"
      signInFallbackRedirectUrl={callback}
      signUpFallbackRedirectUrl={callback}
      signInForceRedirectUrl={callback}
      signUpForceRedirectUrl={callback}
      allowedRedirectOrigins={[appUrl]}
    >
      {inner}
    </ClerkProvider>
  );
}
