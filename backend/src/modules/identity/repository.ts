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

  async upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string | null;
    department?: string | null;
    phone?: string | null;
    isActive?: boolean;
  }) {
    const byClerk = await this.prisma.user.findUnique({ where: { clerkUserId: data.clerkUserId } });
    if (byClerk) {
      return this.prisma.user.update({
        where: { id: byClerk.id },
        data: {
          email: data.email,
          fullName: data.fullName || byClerk.fullName,
          institute: data.institute ?? byClerk.institute,
          department: data.department ?? byClerk.department,
          phone: data.phone ?? byClerk.phone,
          isActive: data.isActive ?? true,
        },
      });
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (byEmail) {
      try {
        return await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            clerkUserId: data.clerkUserId,
            fullName: data.fullName || byEmail.fullName,
            institute: data.institute ?? byEmail.institute,
            department: data.department ?? byEmail.department,
            phone: data.phone ?? byEmail.phone,
            isActive: data.isActive ?? true,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const again = await this.prisma.user.findUnique({ where: { clerkUserId: data.clerkUserId } });
          if (again) return again;
        }
        throw err;
      }
    }

    try {
      return await this.prisma.user.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const again =
          (await this.prisma.user.findUnique({ where: { clerkUserId: data.clerkUserId } })) ??
          (await this.prisma.user.findUnique({ where: { email: data.email } }));
        if (again) return again;
      }
      throw err;
    }
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

  updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
