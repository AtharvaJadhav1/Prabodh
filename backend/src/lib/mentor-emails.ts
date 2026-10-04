import { PlatformRole } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Roles whose emails must never receive a *teammate* invitation. Mentors (faculty / industry /
 * student mentors) and admins are added through their own flows, never via "Add teammate".
 */
export const NON_TEAMMATE_ROLES: PlatformRole[] = [
  PlatformRole.institute_mentor,
  PlatformRole.industry_mentor,
  PlatformRole.student_expert,
  PlatformRole.admin,
];

export const MENTOR_EMAIL_MESSAGE =
  "This email belongs to a mentor or staff member, so it can't be invited as a teammate. " +
  'Mentors are added from the Mentors page instead.';

export type EmailBlocklist = { emails: Set<string>; domains: string[] };

/**
 * `MENTOR_EMAIL_BLOCKLIST` lets mentor emails be fed in ahead of time, before any account exists:
 * a comma/space/newline separated list of exact emails (`neha@college.edu`) and/or whole domains
 * (`@mentors.college.edu` or `*@mentors.college.edu`).
 */
export function parseEmailBlocklist(raw: string | undefined | null): EmailBlocklist {
  const emails = new Set<string>();
  const domains: string[] = [];
  for (const token of String(raw ?? '').split(/[\s,;]+/)) {
    const t = token.trim().toLowerCase().replace(/^\*/, '');
    if (!t) continue;
    if (t.startsWith('@')) domains.push(t);
    else if (t.includes('@')) emails.add(t);
  }
  return { emails, domains };
}

export function matchesEmailBlocklist(email: string, list: EmailBlocklist): boolean {
  const e = email.trim().toLowerCase();
  if (list.emails.has(e)) return true;
  return list.domains.some((d) => e.endsWith(d));
}

/**
 * Returns a user-facing reason when `email` belongs to a mentor/staff member, otherwise null.
 * Sources, so the rule keeps working as mentor data arrives:
 *  1. any account holding a mentor/admin role (primary or secondary),
 *  2. the industrial mentor directory,
 *  3. staff rows in admin user-import batches (even before the batch is activated),
 *  4. the `MENTOR_EMAIL_BLOCKLIST` setting (exact emails or whole domains).
 */
export async function mentorEmailBlockReason(prisma: PrismaService, rawEmail: string): Promise<string | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return null;

  if (matchesEmailBlocklist(email, parseEmailBlocklist(process.env.MENTOR_EMAIL_BLOCKLIST))) {
    return MENTOR_EMAIL_MESSAGE;
  }

  const [account, directory, imported] = await Promise.all([
    prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        OR: [{ platformRole: { in: NON_TEAMMATE_ROLES } }, { additionalRoles: { hasSome: NON_TEAMMATE_ROLES } }],
      },
      select: { id: true },
    }),
    prisma.industrialMentor.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } }),
    prisma.userImportRow.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        platformRole: { in: NON_TEAMMATE_ROLES },
        status: { notIn: ['failed', 'skipped'] },
        batch: { status: { not: 'rejected' } },
      },
      select: { id: true },
    }),
  ]);

  return account || directory || imported ? MENTOR_EMAIL_MESSAGE : null;
}
