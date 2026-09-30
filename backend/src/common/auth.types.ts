import { PlatformRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute: string | null;
};

/** Safe user row loaded by JwtAuthGuard — reused by GET /me to avoid a second query. */
export type AuthDbUser = {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  institute: string | null;
  department: string | null;
  phone: string | null;
  profileJson: unknown;
  domainTags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const AUTH_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  platformRole: true,
  institute: true,
  department: true,
  phone: true,
  profileJson: true,
  domainTags: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
