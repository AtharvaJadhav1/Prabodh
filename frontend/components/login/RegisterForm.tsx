"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { useAuth } from "../auth/AuthProvider";
import { apiPatch, apiPost } from "../../lib/api";
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
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState({ institute: "", department: "", phone: "" });

  const submitRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const institute = String(form.get("institute") ?? "");
    const department = String(form.get("department") ?? "");
    const phone = String(form.get("phone") ?? "");
    setProfile({ institute, department, phone });
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || fullName,
        lastName: lastName || undefined,
        unsafeMetadata: { role: "student", institute, department, phone },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        try {
          await apiPatch("/me", profile);
        } catch {
          /* profile sync is best-effort after Clerk session exists */
        }
        router.push("/dashboard/student");
      } else {
        setError("Additional verification is required. Try signing in.");
      }
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterLayout>
      {pendingVerification ? (
        <form className="space-y-4" onSubmit={(e) => void verify(e)}>
          <p className="text-sm text-brand-muted">Enter the verification code sent to your email.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Verification code"
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm outline-none focus:border-brand-primary"
            required
          />
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void submitRegister(e)}>
          <RegisterFields includePassword />
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create student account"}
          </button>
        </form>
      )}
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

function clerkError(err: unknown) {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    return errors?.[0]?.longMessage || errors?.[0]?.message || "Registration failed";
  }
  return err instanceof Error ? err.message : "Registration failed";
}
