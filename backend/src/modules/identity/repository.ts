import { Injectable } from '@nestjs/common';
import { PlatformRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByClerkId(clerkUserId: string) {
    return this.prisma.user.findUnique({ where: { clerkUserId } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string | null;
    department?: string | null;
    isActive?: boolean;
  }) {
    return this.prisma.user.upsert({
      where: { clerkUserId: data.clerkUserId },
      create: data,
      update: {
        email: data.email,
        fullName: data.fullName,
        platformRole: data.platformRole,
        institute: data.institute,
        department: data.department,
        isActive: data.isActive ?? true,
      },
    });
  }

  deactivateByClerkId(clerkUserId: string) {
    return this.prisma.user.updateMany({
      where: { clerkUserId },
      data: { isActive: false },
    });
  }

  createMany(users: Prisma.UserCreateManyInput[]) {
    return this.prisma.user.createMany({ data: users, skipDuplicates: true });
  }
}
