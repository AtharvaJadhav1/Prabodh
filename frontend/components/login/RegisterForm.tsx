"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { useAuth } from "../auth/AuthProvider";
import { apiPost } from "../../lib/api";
import { AUTH_CALLBACK } from "../../lib/config";
import { dashboardForRole } from "../../lib/session";
import TextField from "./TextField";

export default function RegisterForm() {
  const { clerkEnabled, login } = useAuth();
  if (clerkEnabled) return <ClerkRegisterForm />;
  return <LocalRegisterForm login={login} />;
}

function LocalRegisterForm({ login }: { login: (email: string) => Promise<{ platformRole: string }> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <RegisterLayout>
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
            institute: String(form.get("institute") ?? ""),
            department: String(form.get("department") ?? ""),
            phone: String(form.get("phone") ?? ""),
          };
          try {
            await apiPost("/auth/register", payload);
            const user = await login(payload.email);
            router.push(dashboardForRole(user.platformRole as never));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        <RegisterFields />
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create student account"}
        </button>
      </form>
    </RegisterLayout>
  );
}

function ClerkRegisterForm() {
  return (
    <RegisterLayout>
      <div className="flex justify-center">
        <SignUp
          routing="path"
          path="/register"
          signInUrl="/login/student"
          forceRedirectUrl={AUTH_CALLBACK}
          fallbackRedirectUrl={AUTH_CALLBACK}
          signInForceRedirectUrl={AUTH_CALLBACK}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none border border-brand-sand rounded-2xl",
              card: "shadow-[0_2px_8px_rgba(91,46,16,0.04)] rounded-2xl",
              headerTitle: "font-serif text-brand-deep",
              headerSubtitle: "text-brand-muted text-sm",
              formButtonPrimary:
                "bg-brand-primary hover:bg-brand-hover text-sm font-semibold rounded-xl normal-case",
              formFieldInput: "rounded-xl border-brand-sand text-sm",
              footerActionLink: "text-brand-primary font-semibold",
            },
            variables: {
              colorPrimary: "#D96B27",
              borderRadius: "0.75rem",
            },
          }}
        />
      </div>
    </RegisterLayout>
  );
}

function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Student Registration
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Create a student account to form a team, invite members and mentors, and select a problem statement.
          After you submit, Clerk emails a one-time code — check spam if it does not arrive within a minute.
        </p>
      </div>
      {children}
    </div>
  );
}

function RegisterFields({ includePassword = false }: { includePassword?: boolean }) {
  return (
    <>
      <TextField id="fullName" label="Full name" placeholder="Aarav Sharma" required autoComplete="name" />
      <TextField
        id="email"
        label="Institutional email"
        type="email"
        placeholder="you@mituniversity.edu.in"
        required
        autoComplete="email"
      />
      {includePassword ? (
        <TextField
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />
      ) : null}
      <TextField
        id="institute"
        label="Institute"
        placeholder="MIT Art, Design and Technology University"
        required
        autoComplete="organization"
      />
      <TextField id="department" label="Department" placeholder="CSE" autoComplete="organization-title" />
      <TextField id="phone" label="Phone" type="text" placeholder="Optional" autoComplete="tel" />
    </>
  );
}
