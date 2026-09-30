"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { friendlyAuthError, loginWithPassword, type AuthResponse } from "../../lib/auth-login";
import TextField from "./TextField";

type Props = {
  portal?: "student" | "faculty";
  title: string;
  description?: string;
  submitLabel: string;
  footer?: React.ReactNode;
  onSuccess: (result: AuthResponse) => void;
};

export default function LoginPasswordForm({
  portal,
  title,
  description,
  submitLabel,
  footer,
  onSuccess,
}: Props) {
  const searchParams = useSearchParams();
  const presetEmail = (searchParams.get("email") ?? "").trim();
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email from invite / credentials links can arrive after the first render (Suspense).
  useEffect(() => {
    if (presetEmail) setEmail(presetEmail);
  }, [presetEmail]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
        ) : null}
      </div>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          try {
            const res = await loginWithPassword(email.trim().toLowerCase(), password.trim(), portal);
            if (!res?.accessToken || !res?.platformRole) {
              throw new Error("Sign-in succeeded but the server response was incomplete. Try again.");
            }
            onSuccess(res);
          } catch (err) {
            setError(friendlyAuthError(err));
          } finally {
            setLoading(false);
          }
        }}
      >
        <TextField
          id="login-email"
          label="Email"
          type="email"
          placeholder="e.g. name@example.com"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-brand-sand bg-white py-3 pl-4 pr-11 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3 rounded-lg p-1.5 text-brand-muted transition-colors hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
            >
              <HugeiconsIcon
                icon={showPassword ? ViewOffIcon : ViewIcon}
                strokeWidth={1.5}
                className="h-5 w-5"
              />
            </button>
          </div>
          <p className="text-right">
            <Link href="/login/forgot" className="text-xs font-semibold text-brand-primary hover:text-brand-hover">
              Forgot password?
            </Link>
          </p>
        </div>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Signing in… (first request may take up to a minute)" : submitLabel}
        </button>
      </form>
      {footer}
    </div>
  );
}
