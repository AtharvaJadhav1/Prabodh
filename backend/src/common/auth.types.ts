import { PlatformRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  /** Secondary roles (dual-mentor accounts). Empty for single-role users. */
  additionalRoles: PlatformRole[];
  /** Workspace the user is currently acting in — always one of allRoles. */
  activeRole: PlatformRole;
  institute: string | null;
};

/** Safe user row loaded by JwtAuthGuard — reused by GET /me to avoid a second query. */
export type AuthDbUser = {
  id: string;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  additionalRoles: PlatformRole[];
  institute: string | null;
  department: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  profileJson: unknown;
  domainTags: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const AUTH_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  platformRole: true,
  additionalRoles: true,
  institute: true,
  department: true,
  phone: true,
  linkedinUrl: true,
  profileJson: true,
  domainTags: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} as const;
