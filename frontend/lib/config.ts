export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
export const SESSION_KEY = "sih-session";
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const STUDENT_DASHBOARD = "/dashboard/student";
export const MENTOR_DASHBOARD = "/dashboard/mentor";

/** Clerk v7 — AFTER_SIGN_IN_URL is deprecated; prefer FALLBACK or FORCE redirect vars. */
export const CLERK_SIGN_IN_REDIRECT =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ??
  STUDENT_DASHBOARD;

export const CLERK_SIGN_UP_REDIRECT =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ??
  STUDENT_DASHBOARD;
