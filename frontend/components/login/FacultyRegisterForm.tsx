"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import OtpAuthFlow from "./OtpAuthFlow";
import TextField from "./TextField";
import { INSTITUTES } from "./RegisterForm";

type MentorKind = "institute" | "industry";

type FacultyDraft = {
  fullName: string;
  email: string;
  password: string;
  institute: string;
  department: string;
  phone: string;
  mentorKind: MentorKind;
};

export default function FacultyRegisterForm() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mentorKind, setMentorKind] = useState<MentorKind>("institute");
  const [draft, setDraft] = useState<FacultyDraft | null>(null);

  if (draft) {
    const isIndustry = draft.mentorKind === "industry";
    return (
      <OtpAuthFlow
        purpose="register"
        title={isIndustry ? "Verify industry mentor email" : "Verify faculty email"}
        description={
          isIndustry
            ? "Enter the OTP sent to your work email to create your industry mentor account."
            : "Enter the OTP sent to your official university email to complete faculty registration."
        }
        submitLabel={isIndustry ? "Verify & create industry mentor ID" : "Verify & create faculty account"}
        initialEmail={draft.email}
        profile={{
          fullName: draft.fullName,
          institute: draft.institute,
          department: draft.department,
          phone: draft.phone,
          password: draft.password,
          accountType: isIndustry ? "industry" : "faculty",
        }}
        onSuccess={(result) => {
          establishSession(result);
          router.replace(dashboardForRole(result.platformRole));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Mentor Registration
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Create an institute faculty ID or an industry mentor ID. Students invite you using this email address.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setLoading(true);
          const form = new FormData(e.currentTarget);
          const payload: FacultyDraft = {
            fullName: String(form.get("fullName") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            institute: String(form.get("institute") ?? ""),
            department: String(form.get("department") ?? ""),
            phone: String(form.get("phone") ?? ""),
            mentorKind,
          };
          try {
            if (payload.password.length < 8) {
              throw new Error("Password must be at least 8 characters.");
            }
            setDraft(payload);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">Account type</label>
          <select
            value={mentorKind}
            onChange={(e) => setMentorKind(e.target.value as MentorKind)}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="institute">Institute mentor (faculty)</option>
            <option value="industry">Industry mentor</option>
          </select>
        </div>
        <TextField id="fullName" label="Full name" placeholder="Dr. Neha Kulkarni" required autoComplete="name" />
        <TextField
          id="email"
          label={mentorKind === "industry" ? "Work email" : "Official university email"}
          type="email"
          placeholder={
            mentorKind === "industry" ? "mentor@company.com" : "faculty@mituniversity.edu.in"
          }
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
        {mentorKind === "institute" ? (
          <div className="space-y-1.5">
            <label htmlFor="institute" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
              Institute
            </label>
            <select
              id="institute"
              name="institute"
              required
              defaultValue=""
              className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="" disabled>
                Select your institute
              </option>
              {INSTITUTES.map((institute) => (
                <option key={institute} value={institute}>
                  {institute}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <TextField
            id="institute"
            label="Organisation / Company"
            placeholder="Acme Technologies"
            required
            autoComplete="organization"
          />
        )}
        <TextField
          id="department"
          label={mentorKind === "industry" ? "Domain / Expertise" : "Department"}
          placeholder={mentorKind === "industry" ? "AI / IoT" : "CSE"}
          required
          autoComplete="organization-title"
        />
        <TextField id="phone" label="Phone" type="text" placeholder="Optional" autoComplete="tel" />
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading
            ? "Sending verification code…"
            : mentorKind === "industry"
              ? "Continue — create industry mentor ID"
              : "Continue — verify email"}
        </button>
      </form>
      <p className="text-center text-sm text-brand-muted">
        Already registered?{" "}
        <a href="/login/faculty" className="font-semibold text-brand-primary hover:text-brand-hover">
          Faculty / mentor sign in
        </a>
      </p>
    </div>
  );
}
