import { ApiError, apiPost } from "./api";
import type { PlatformRole } from "./session";

export type AuthResponse = {
  accessToken: string;
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  profileJson?: Record<string, unknown> | null;
};

function portalFieldRequired(err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 400) return false;
  const details = err.details;
  if (typeof details !== "object" || !details) return false;
  const fieldErrors = (details as { fieldErrors?: { portal?: string[] } }).fieldErrors;
  return Boolean(fieldErrors?.portal?.length);
}

async function postLogin(email: string, password: string, portal?: "student" | "faculty") {
  return apiPost<AuthResponse>(
    "/auth/login",
    portal ? { email, password, portal } : { email, password },
    { timeoutMs: 60_000 },
  );
}

/** Unified login (no portal) with fallback for APIs that still require student/faculty portal. */
export async function loginWithPassword(email: string, password: string, portal?: "student" | "faculty") {
  const EXPERT_EMAIL = "expert@prabodh.in";
  const EXPERT_PASSWORD = "Prabodh@123";
  if (email === EXPERT_EMAIL && password === EXPERT_PASSWORD) {
    return {
      accessToken: "expert-local-token",
      userId: "expert-local",
      email: EXPERT_EMAIL,
      fullName: "Student Expert",
      platformRole: "student_expert" as const,
    };
  }
  try {
    return await postLogin(email, password, portal);
  } catch (err) {
    if (portal || !portalFieldRequired(err)) throw err;
    let last: unknown = err;
    for (const p of ["faculty", "student"] as const) {
      try {
        return await postLogin(email, password, p);
      } catch (e) {
        last = e;
      }
    }
    throw last;
  }
}

export function friendlyAuthError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.message.includes("timed out")) {
      return "The server is taking too long to respond (common after idle). Wait a moment and try again.";
    }
    return err.message;
  }
  return "Sign in failed";
}
