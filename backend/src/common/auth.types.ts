import { PlatformRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  clerkUserId: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute: string | null;
};
