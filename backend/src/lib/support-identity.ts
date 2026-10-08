import { PlatformRole } from '@prisma/client';
import { PrismaService } from './prisma.service';

/** The single seeded support account. Hardcoded (not env-configured) by design — see seed.ts. */
export const SUPPORT_EMAIL = 'support@gmail.com';

let cached: { id: string; fullName: string } | null | undefined;

/**
 * Looks up the seeded support user once per process. Returns null (not a throw) when the
 * account hasn't been seeded, so environments without it just don't surface support features.
 */
export async function getSupportUser(prisma: PrismaService) {
  if (cached !== undefined) return cached;
  try {
    const row = await prisma.user.findFirst({
      where: { email: SUPPORT_EMAIL, platformRole: PlatformRole.support, isActive: true },
      select: { id: true, fullName: true },
    });
    cached = row ?? null;
    return cached;
  } catch (err) {
    // e.g. the database does not have the 'support' role value yet: Support is just unavailable,
    // it must never take the whole chat down. Not cached, so it recovers once the database is fixed.
    console.error('[chat] support account lookup failed; continuing without Support', err);
    return null;
  }
}
