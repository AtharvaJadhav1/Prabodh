"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole, landingForLogin, type PlatformRole } from "../../lib/session";
import LoginPasswordForm from "./LoginPasswordForm";

function safeNextPath(raw: string | null, role: PlatformRole) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("://")) {
    return raw;
  }
  return dashboardForRole(role);
}

export default function UnifiedLoginForm() {
  const searchParams = useSearchParams();
  const { establishSession } = useAuth();
  const notice = searchParams.get("notice");
  const next = searchParams.get("next");
  const fromInvite = Boolean(searchParams.get("email"));

  return (
    <LoginPasswordForm
      title="Sign in"
      submitLabel="Sign in"
      footer={
        <div className="space-y-3">
          {notice === "account-deleted" ? (
            <p className="rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-center text-xs text-brand-muted">
              Your account has been successfully deleted.
            </p>
          ) : notice === "faculty-invite-only" || fromInvite ? (
            <p className="rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-center text-xs text-brand-muted">
              Faculty and industry mentor accounts are registered by your institute. Use the credentials from your
              email, or contact your administrator if you have not received them.
            </p>
          ) : null}
          <p className="text-center text-sm text-brand-muted">
            <a href="/register" className="font-semibold text-brand-primary hover:text-brand-hover">
              Create a student account
            </a>
          </p>
        </div>
      }
      onSuccess={(result) => {
        establishSession(result);
        window.location.assign(landingForLogin(result));
      }}
    />
  );
}
