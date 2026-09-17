import type { Metadata } from "next";
import { Suspense } from "react";
import LoginShell from "../../components/login/LoginShell";
import UnifiedLoginForm from "../../components/login/UnifiedLoginForm";

export const metadata: Metadata = {
  title: { absolute: "Sign in | Prabodh" },
  description: "Sign in to Prabodh with your institutional email. Students, mentors, and administrators use one login page.",
};

export default function LoginPage() {
  return (
    <LoginShell showPortalTabs={false}>
      <Suspense fallback={<p className="text-sm text-brand-muted">Loading…</p>}>
        <UnifiedLoginForm />
      </Suspense>
    </LoginShell>
  );
}
