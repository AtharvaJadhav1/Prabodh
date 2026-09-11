import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export async function writeAudit(
  prisma: PrismaService,
  input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
  },
) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  });
}
