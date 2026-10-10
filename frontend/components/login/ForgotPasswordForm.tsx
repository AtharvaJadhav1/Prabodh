"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { apiPost } from "../../lib/api";
import TextField from "./TextField";
import Turnstile from "../auth/Turnstile";
import { useResendCooldown, getResendRemaining } from "./useResendCooldown";

type Step = "email" | "code" | "reset" | "done";

const FORGOT_EMAIL_KEY = "prabodh:forgotPassword:email";
const FORGOT_STEP_KEY = "prabodh:forgotPassword:step";

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [devHint, setDevHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstileRef = useRef<React.ComponentRef<typeof Turnstile>>(null);
  const resend = useResendCooldown(`forgot:${email.trim().toLowerCase()}`, 300);

  // Restore the verification screen after a refresh so the cooldown keeps ticking.
  useEffect(() => {
    try {
      const savedStep = window.localStorage.getItem(FORGOT_STEP_KEY);
      const savedEmail = window.localStorage.getItem(FORGOT_EMAIL_KEY);
      if (savedStep === "code" && savedEmail && getResendRemaining(`forgot:${savedEmail.trim().toLowerCase()}`) > 0) {
        setEmail(savedEmail);
        setStep("code");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist only the "code" step; reset/done are one-shot and must not be restored.
  useEffect(() => {
    try {
      if (step === "code") {
        window.localStorage.setItem(FORGOT_STEP_KEY, "code");
        if (email) window.localStorage.setItem(FORGOT_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(FORGOT_STEP_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [step, email]);

  // Entering (or re-entering) the verification screen resumes or starts the cooldown.
  useEffect(() => {
    if (step === "code") resend.sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, email]);

  // Flow complete — drop persisted state so a later visit starts clean.
  useEffect(() => {
    if (step !== "done") return;
    try {
      window.localStorage.removeItem(FORGOT_STEP_KEY);
      window.localStorage.removeItem(FORGOT_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    resend.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function sendResetCode() {
    setError("");
    setLoading(true);
    setDevHint("");
    try {
      const captchaToken = await turnstileRef.current?.execute("forgot_password");
      if (!captchaToken) {
        throw new Error("Security check failed. Please refresh the page and try again.");
      }
      const res = await apiPost<{ message: string; devCode?: string }>("/auth/password/forgot", { email, captchaToken });
      if (res.devCode) setDevHint(`Dev code: ${res.devCode}`);
      setCode("");
      setStep("code");
      resend.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
    }
  }

  async function verifyCode() {
    setError("");
    setLoading(true);
    try {
      const captchaToken = await turnstileRef.current?.execute("forgot_password");
      if (!captchaToken) {
        throw new Error("Security check failed. Please refresh the page and try again.");
      }
      const res = await apiPost<{ resetToken: string }>("/auth/password/verify", {
        email,
        code,
        captchaToken,
      });
      setResetToken(res.resetToken);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code");
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    setError("");
    setLoading(true);
    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      if (password !== confirm) {
        throw new Error("Passwords do not match.");
      }
      const captchaToken = await turnstileRef.current?.execute("forgot_password");
      if (!captchaToken) {
        throw new Error("Security check failed. Please refresh the page and try again.");
      }
      await apiPost("/auth/password/reset", { email, resetToken, password, captchaToken });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Password updated</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Your password has been changed. Sign in with your email and new password.
          </p>
        </div>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Verify your code</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Enter the 6-digit code sent to <span className="break-all font-semibold text-brand-deep">{email}</span>. You will
            choose a new password after the code is verified.
          </p>
        </div>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode();
          }}
        >
          <TextField
            id="reset-code"
            label="Verification code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-digit code"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            labelAction={
              <button
                type="button"
                disabled={loading || resend.isActive}
                onClick={() => {
                  resend.start();
                  void sendResetCode();
                }}
                className={
                  "shrink-0 text-xs font-semibold transition-colors " +
                  (resend.isActive
                    ? "cursor-not-allowed text-brand-muted"
                    : "text-brand-primary hover:text-brand-hover disabled:opacity-60")
                }
              >
                {resend.isActive ? `Resend code in ${formatCountdown(resend.secondsLeft)}` : "Resend code"}
              </button>
            }
          />
          {devHint ? <p className="break-words text-xs font-mono text-amber-800">{devHint}</p> : null}
          {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}
          <Turnstile ref={turnstileRef} action="forgot_password" theme="light" />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify code"}
          </button>
        </form>
        <p className="text-center text-sm text-brand-muted">
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep("email");
            }}
            className="font-semibold text-brand-primary hover:text-brand-hover"
          >
            Use a different email
          </button>
        </p>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Choose a new password</h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Code verified for <span className="break-all font-semibold text-brand-deep">{email}</span>. Enter your new
            password below.
          </p>
        </div>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitNewPassword();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="reset-password" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
              New password
            </label>
            <div className="relative flex items-center">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
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
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-confirm" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
          </div>
          {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}
          <Turnstile ref={turnstileRef} action="forgot_password" theme="light" />
          <button
            type="submit"
            disabled={loading || password.length < 8 || !confirm}
            className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="text-center text-sm text-brand-muted">
          <Link href="/login" className="font-semibold text-brand-primary hover:text-brand-hover">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Forgot password</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Enter your account email. We will send a one-time code so you can set a new password.
        </p>
      </div>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void sendResetCode();
        }}
      >
        <TextField
          id="forgot-email"
          label="Email"
          type="email"
          placeholder="e.g. name@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="break-words text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !email}
          className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Sending code…" : "Send reset code"}
        </button>
      </form>
      <Turnstile ref={turnstileRef} action="forgot_password" theme="light" />
      <p className="text-center text-sm text-brand-muted">
        <Link href="/login" className="font-semibold text-brand-primary hover:text-brand-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
