"use client";

import { SignIn } from "@clerk/nextjs";
import { absoluteAuthCallback } from "../../lib/config";

type Props = {
  path: string;
};

export default function ClerkSignInPanel({ path }: Props) {
  const signUpUrl = path.includes("faculty") ? path : "/register";
  // Absolute public URL — never Render localhost:10000.
  const afterAuth = absoluteAuthCallback();

  return (
    <div className="flex justify-center">
      <SignIn
        routing="path"
        path={path}
        signUpUrl={signUpUrl}
        forceRedirectUrl={afterAuth}
        fallbackRedirectUrl={afterAuth}
        signUpForceRedirectUrl={afterAuth}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none border border-brand-sand rounded-2xl",
            card: "shadow-[0_2px_8px_rgba(91,46,16,0.04)] rounded-2xl",
            headerTitle: "font-serif text-brand-deep",
            headerSubtitle: "text-brand-muted text-sm",
            formButtonPrimary:
              "bg-brand-primary hover:bg-brand-hover text-sm font-semibold rounded-xl normal-case",
            formFieldInput: "rounded-xl border-brand-sand text-sm",
            footerActionLink: "text-brand-primary font-semibold",
          },
          variables: {
            colorPrimary: "#D96B27",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}
