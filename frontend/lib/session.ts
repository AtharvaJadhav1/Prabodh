import { SESSION_KEY } from "./config";

export type PlatformRole = "student" | "institute_mentor" | "industry_mentor" | "admin" | "student_expert";

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  /** Secondary roles (dual-mentor accounts). Empty for single-role users. */
  additionalRoles: PlatformRole[];
  /** Workspace currently in use — always one of allRoles(session). */
  activeRole: PlatformRole;
  institute?: string | null;
  department?: string | null;
  phone?: string | null;
  accessToken?: string;
  profileJson?: Record<string, unknown>;
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
  if (role === "student_expert") return "/dashboard/expert";
  return "/dashboard/student";
}

/** Every role an account holds — primary first, extras deduplicated. */
export function allRoles(session: Pick<Session, "platformRole" | "additionalRoles">): PlatformRole[] {
  const extras = Array.isArray(session.additionalRoles) ? session.additionalRoles : [];
  return [session.platformRole, ...extras.filter((r) => r !== session.platformRole)];
}

/** Dual-mentor account: holds both institute_mentor and industry_mentor. */export function isDualMentor(
  session: Pick<Session, "platformRole" | "additionalRoles"> | null | undefined,
): boolean {
  if (!session) return false;
  const held = allRoles(session);
  return held.includes("institute_mentor") && held.includes("industry_mentor");
}

/** True when the record holds the role as primary OR secondary. */
export function holdsRole(
  record: { platformRole: string; additionalRoles?: string[] | null } | null | undefined,
  role: string,
): boolean {
  if (!record) return false;
  if (record.platformRole === role) return true;
  return Array.isArray(record.additionalRoles) && record.additionalRoles.includes(role);
}

function lastRoleKey(userId: string) {
  return `prabodh:activeRole:${userId}`;
}

/** Landing dashboard right after sign-in: explicit workspace > last-used > primary. */
export function landingForLogin(result: {
  userId?: string;
  platformRole: PlatformRole;
  additionalRoles?: PlatformRole[] | null;
  activeRole?: PlatformRole | null;
}): string {
  const extras = Array.isArray(result.additionalRoles)
    ? result.additionalRoles.filter((r) => r !== result.platformRole)
    : [];
  const held: PlatformRole[] = [result.platformRole, ...extras];
  if (result.activeRole && held.includes(result.activeRole)) {
    return dashboardForRole(result.activeRole);
  }
  const stored = result.userId ? readLastActiveRole(result.userId) : null;
  if (stored && held.includes(stored)) return dashboardForRole(stored);
  return dashboardForRole(result.platformRole);
}

/** Last-used workspace for this account (this browser). Null when unset/unknown. */
export function readLastActiveRole(userId: string): PlatformRole | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(lastRoleKey(userId));
    if (
      raw === "student" ||
      raw === "institute_mentor" ||
      raw === "industry_mentor" ||
      raw === "admin" ||
      raw === "student_expert"
    ) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeLastActiveRole(userId: string, role: PlatformRole) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(lastRoleKey(userId), role);
  } catch {
    /* storage unavailable — last-used memory is best-effort */
  }
}
