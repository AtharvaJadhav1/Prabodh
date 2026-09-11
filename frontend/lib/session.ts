import { SESSION_KEY } from "./config";

export type PlatformRole = "student" | "institute_mentor" | "industry_mentor" | "admin";

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  accessToken?: string;
  /** @deprecated use accessToken */
  clerkToken?: string;
};

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function dashboardForRole(role: PlatformRole) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "institute_mentor") return "/dashboard/mentor";
  if (role === "industry_mentor") return "/dashboard/industry";
  return "/dashboard/student";
}
