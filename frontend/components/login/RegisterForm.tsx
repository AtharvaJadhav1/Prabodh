"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { apiPost } from "../../lib/api";
import { dashboardForRole } from "../../lib/session";
import TextField from "./TextField";

export default function RegisterForm() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Student Registration
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Create a student account with your institutional email to form a team, invite members and mentors, and
          select a problem statement.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          const form = new FormData(e.currentTarget);
          const payload = {
            fullName: String(form.get("fullName") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            institute: String(form.get("institute") ?? ""),
            department: String(form.get("department") ?? ""),
            phone: String(form.get("phone") ?? ""),
          };
          try {
            const result = await apiPost<{
              accessToken: string;
              userId: string;
              email: string;
              fullName: string;
              platformRole: "student";
            }>("/auth/register", payload);
            establishSession(result);
            router.replace(dashboardForRole(result.platformRole));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        <TextField id="fullName" label="Full name" placeholder="Aarav Sharma" required autoComplete="name" />
        <TextField
          id="email"
          label="Institutional email"
          type="email"
          placeholder="you@mituniversity.edu.in"
          required
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
        <TextField
          id="institute"
          label="Institute"
          placeholder="MIT Art, Design and Technology University"
          required
          autoComplete="organization"
        />
        <TextField id="department" label="Department" placeholder="CSE" autoComplete="organization-title" />
        <TextField id="phone" label="Phone" type="text" placeholder="Optional" autoComplete="tel" />
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create student account"}
        </button>
      </form>
      <p className="text-center text-sm text-brand-muted">
        Already registered?{" "}
        <a href="/login/student" className="font-semibold text-brand-primary hover:text-brand-hover">
          Sign in
        </a>
      </p>
    </div>
  );
}
