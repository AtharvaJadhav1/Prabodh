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
  const row = await prisma.user.findFirst({
    where: { email: SUPPORT_EMAIL, platformRole: PlatformRole.support, isActive: true },
    select: { id: true, fullName: true },
  });
  cached = row ?? null;
  return cached;
}
