import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
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
