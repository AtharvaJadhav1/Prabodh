"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { dashboardForRole } from "../../lib/session";
import OtpAuthFlow from "./OtpAuthFlow";
import TextField from "./TextField";

export default function RegisterForm() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    institute: string;
    department: string;
    phone: string;
  } | null>(null);

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
            Student Registration
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Create a student account to form a team, invite members and mentors, and select a problem statement.
            We will email a one-time verification code to confirm your address.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setProfile({
              fullName: String(form.get("fullName") ?? ""),
              email: String(form.get("email") ?? ""),
              institute: String(form.get("institute") ?? ""),
              department: String(form.get("department") ?? ""),
              phone: String(form.get("phone") ?? ""),
            });
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
          <TextField
            id="institute"
            label="Institute"
            placeholder="MIT Art, Design and Technology University"
            required
            autoComplete="organization"
          />
          <TextField id="department" label="Department" placeholder="CSE" autoComplete="organization-title" />
          <TextField id="phone" label="Phone" type="text" placeholder="Optional" autoComplete="tel" />
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover"
          >
            Continue to email verification
          </button>
        </form>
      </div>
    );
  }

  return (
    <OtpAuthFlow
      purpose="register"
      title="Verify your email"
      description="Confirm your student registration with the code we send to your institutional email."
      submitLabel="Create student account"
      initialEmail={profile.email}
      profile={{
        fullName: profile.fullName,
        institute: profile.institute || undefined,
        department: profile.department || undefined,
        phone: profile.phone || undefined,
      }}
      onSuccess={(result) => {
        establishSession(result);
        router.push(dashboardForRole(result.platformRole as never));
      }}
    />
  );
}
