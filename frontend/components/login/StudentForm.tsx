"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import TextField from "./TextField";

export default function StudentForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Student Team Sign In
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Sign in with your institutional email. Team lead vs member is determined by your roster, not this form.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          const form = e.currentTarget;
          const email = String(new FormData(form).get("student-email") ?? "");
          try {
            const user = await login(email);
            router.push(user.platformRole === "student" ? "/dashboard/student" : dashboardForRole(user.platformRole));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign in failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        <TextField
          id="student-email"
          label="Institutional Email"
          type="email"
          placeholder="you@institute.edu"
          required
          autoComplete="username"
        />

        <div className="space-y-1.5">
          <label htmlFor="student-password" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="student-password"
              name="student-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="w-full rounded-xl border border-brand-sand bg-white py-3 pl-4 pr-16 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 rounded p-1 text-xs font-semibold text-brand-muted transition-colors hover:text-brand-deep"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In to Student Workspace"}
        </button>
      </form>
    </div>
  );
}
