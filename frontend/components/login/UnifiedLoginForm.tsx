"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import LoginPasswordForm from "./LoginPasswordForm";

export default function UnifiedLoginForm() {
  const searchParams = useSearchParams();
  const { establishSession } = useAuth();
  const notice = searchParams.get("notice");

  return (
    <LoginPasswordForm
      title="Sign in"
      submitLabel="Sign in"
      footer={
        <div className="space-y-3">
          {notice === "faculty-invite-only" ? (
            <p className="rounded-xl border border-brand-softline bg-brand-cream px-3 py-2 text-center text-xs text-brand-muted">
              Faculty and staff accounts are created by your administrator. Check your email for login credentials,
              then sign in above.
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
        window.location.assign(dashboardForRole(result.platformRole));
      }}
    />
  );
}
