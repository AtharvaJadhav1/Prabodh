export const SESSION_KEY = "sih-session";

export const STUDENT_DASHBOARD = "/dashboard/student";
export const MENTOR_DASHBOARD = "/dashboard/mentor";

/** Strip trailing slashes and ensure the Nest global prefix `/api` is present. */
export function normalizeApiBase(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const envApiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

/**
 * In the browser, call same-origin `/api` (Next.js rewrites to Nest). That survives
 * custom Render domains and a NEXT_PUBLIC_API_URL that omitted `/api`.
 * Server-side fetches still use the absolute backend URL.
 */
export const API_BASE = typeof window === "undefined" ? envApiBase || "http://localhost:3001/api" : "/api";
