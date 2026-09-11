export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
export const SESSION_KEY = "sih-session";
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const STUDENT_DASHBOARD = "/dashboard/student";
export const MENTOR_DASHBOARD = "/dashboard/mentor";

/** Public post-login route — waits for Clerk cookie + /me before entering /dashboard. */
export const AUTH_CALLBACK = "/auth/callback";

/**
 * Public site origin (never Render's internal localhost:10000).
 * Used for Clerk redirect URLs so cookies stick on the real host.
 */
export function publicAppUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv;
  }
  if (typeof window !== "undefined") {
    const { origin } = window.location;
    if (origin && !/localhost|127\.0\.0\.1/i.test(origin)) return origin;
  }
  return "https://prabodh-2.onrender.com";
}

export function absoluteAuthCallback(): string {
  return `${publicAppUrl()}${AUTH_CALLBACK}`;
}

/** Clerk v7 — AFTER_SIGN_IN_URL is deprecated; prefer FALLBACK or FORCE redirect vars. */
export const CLERK_SIGN_IN_REDIRECT =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ??
  AUTH_CALLBACK;

export const CLERK_SIGN_UP_REDIRECT =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ??
  AUTH_CALLBACK;
