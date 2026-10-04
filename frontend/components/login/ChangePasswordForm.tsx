"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "../../lib/api";
import { invalidateApiCache } from "../../lib/api-cache";
import { dashboardForRole } from "../../lib/session";
import { useAuth } from "../auth/AuthProvider";

const inputClass =
  "w-full rounded-xl border border-brand-sand bg-white py-3 px-4 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-brand-deep";

/** Forced first-login step: replaces the admin-issued password before the portal opens. */
export default function ChangePasswordForm() {
  const router = useRouter();
  const { session, ready, refreshMe, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (!session.mustChangePassword) router.replace(dashboardForRole(session.activeRole ?? session.platformRole));
  }, [ready, session, router]);

  async function submit() {
    setError("");
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (next === current) {
      setError("Choose a new password that is different from the one in your email.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/me/change-password", { currentPassword: current, newPassword: next });
      invalidateApiCache(/.*/);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password");
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !session?.mustChangePassword) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Set your password</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          For your security, replace the password from your email with one only you know. You will then continue to
          your dashboard.
        </p>
      </div>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="cp-current" className={labelClass}>
            Password from your email
          </label>
          <input
            id="cp-current"
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cp-new" className={labelClass}>
            New password
          </label>
          <input
            id="cp-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-brand-muted">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cp-confirm" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="cp-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !current || !next || !confirm}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save and continue"}
        </button>
      </form>
      <p className="text-center text-sm text-brand-muted">
        <button type="button" onClick={() => logout()} className="font-semibold text-brand-primary hover:text-brand-hover">
          Sign out
        </button>
      </p>
    </div>
  );
}
