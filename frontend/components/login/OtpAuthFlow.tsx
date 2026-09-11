"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost } from "../../lib/api";
import type { PlatformRole } from "../../lib/session";
import TextField from "./TextField";

type AuthResponse = {
  accessToken: string;
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  devCode?: string;
};

type Props = {
  purpose: "login" | "register";
  title: string;
  description: string;
  submitLabel: string;
  initialEmail?: string;
  profile?: {
    fullName: string;
    institute?: string;
    department?: string;
    phone?: string;
  };
  onSuccess: (result: AuthResponse) => void;
};

export default function OtpAuthFlow({
  purpose,
  title,
  description,
  submitLabel,
  initialEmail = "",
  profile,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoSent = useRef(false);

  async function sendCode() {
    setError("");
    setLoading(true);
    setDevHint("");
    try {
      const res = await apiPost<{ message: string; devCode?: string }>("/auth/otp/send", {
        email,
        purpose,
        ...(profile ?? {}),
      });
      if (res.devCode) setDevHint(`Dev code: ${res.devCode}`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile || autoSent.current || !email) return;
    autoSent.current = true;
    void sendCode();
  }, [profile, email]);

  async function verifyCode() {
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<AuthResponse>("/auth/otp/verify", {
        email,
        purpose,
        code,
      });
      onSuccess(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
      </div>

      {step === "email" ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <TextField
            id="otp-email"
            label="Institutional email"
            type="email"
            placeholder="you@institute.edu"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || !email}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Sending code…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode();
          }}
        >
          <p className="text-sm text-brand-muted">
            Enter the 6-digit code sent to <span className="font-semibold text-brand-deep">{email}</span>.
          </p>
          <TextField
            id="otp-code"
            label="Verification code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {devHint ? <p className="text-xs font-mono text-amber-800">{devHint}</p> : null}
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Verifying…" : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            className="w-full text-sm font-semibold text-brand-primary hover:text-brand-hover"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
