"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { landingForLogin } from "../../lib/session";
import OtpAuthFlow from "./OtpAuthFlow";
import TextField from "./TextField";
import PasswordField from "./PasswordField";
import FilterDropdown from "../admin/FilterDropdown";

export const INSTITUTES = [
  "Vishwashanti Sangeet Kala Academy",
  "School of Fine Arts and Applied Arts",
  "Institute of Design",
  "School of Architecture & Planning",
  "School of Computing",
  "School of Artificial Intelligence",
  "School of Engineering & Sciences",
  "School of Food Technology",
  "School of Bioengineering Sciences and Research",
  "Maharashtra Academy of Naval Education and Training",
  "School of Education and Research",
  "School of Vedic Sciences",
  "School of Humanities",
  "School of Indian Civil Services",
  "School of Business and Computer Applications",
  "College of Management and Computer Applications",
  "School of Film and Television",
  "School of Drama",
  "School of Law",
];

type RegistrationDraft = {
  fullName: string;
  email: string;
  password: string;
  institute: string;
  department: string;
  phone: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [institute, setInstitute] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [draft, setDraft] = useState<RegistrationDraft | null>(null);

  if (draft) {
    return (
      <OtpAuthFlow
        purpose="register"
        title="Verify your email"
        description="We sent a 6-digit code to your email. Enter it below to activate your student account."
        submitLabel="Verify & create account"
        initialEmail={draft.email}
        profile={{
          fullName: draft.fullName,
          institute: draft.institute,
          department: draft.department,
          phone: draft.phone,
          password: draft.password,
          accountType: "student",
        }}
        onSuccess={(result) => {
          establishSession(result);
          router.replace(landingForLogin(result));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Student Registration
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Create your account with your email. We will send a code to verify it.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          const form = new FormData(e.currentTarget);
          const payload: RegistrationDraft = {
            fullName: String(form.get("fullName") ?? ""),
            email: String(form.get("email") ?? ""),
            password,
            institute,
            department: String(form.get("department") ?? ""),
            phone: String(form.get("phone") ?? ""),
          };
          try {
            if (payload.password.length < 8) {
              throw new Error("Password must be at least 8 characters.");
            }
            if (password !== confirmPassword) {
              throw new Error("Passwords do not match.");
            }
            if (!payload.institute) {
              throw new Error("Please select your institute.");
            }
            if (!agreed) {
              throw new Error("Please agree to the Privacy Policy to continue.");
            }
            setDraft(payload);
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
          label="Email"
          type="email"
          placeholder="e.g. name@example.com"
          required
          autoComplete="email"
        />
        <PasswordField
          id="password"
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Institute</span>
          <FilterDropdown
            options={INSTITUTES.map((name) => ({ value: name, label: name }))}
            value={institute}
            onChange={setInstitute}
          />
        </div>
        <TextField id="department" label="Department" placeholder="CSE" autoComplete="organization-title" />
        <TextField
          id="phone"
          type="text"
          autoComplete="tel"
          label={
            <>
              Phone <span className="normal-case font-medium text-brand-muted">(Optional)</span>
            </>
          }
        />
        <label className="flex items-start gap-2 text-sm text-brand-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary"
          />
          <span>
            I agree to the{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-primary hover:text-brand-hover"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Sending verification code…" : "Verify email"}
        </button>
      </form>
      <p className="text-center text-sm text-brand-muted">
        Already registered?{" "}
        <a href="/login" className="font-semibold text-brand-primary hover:text-brand-hover">
          Sign in
        </a>
      </p>
    </div>
  );
}
