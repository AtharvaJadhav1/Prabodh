export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
export const SESSION_KEY = "sih-session";
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const STUDENT_DASHBOARD = "/dashboard/student";
export const MENTOR_DASHBOARD = "/dashboard/mentor";

/** Public post-login route — waits for Clerk + /me before entering /dashboard. */
export const AUTH_CALLBACK = "/auth/callback";

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
