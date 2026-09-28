import { Prisma } from '@prisma/client';

type AuditInput = {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
};

export async function writeAudit(
  prisma: Pick<Prisma.TransactionClient, 'auditLog' | 'user'>,
  input: AuditInput,
) {
  let { actorName, actorEmail, actorRole } = input;
  if (actorName == null || actorEmail == null || actorRole == null) {
    const actor = await prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { fullName: true, email: true, platformRole: true },
    });
    if (actor) {
      actorName = actorName ?? actor.fullName;
      actorEmail = actorEmail ?? actor.email;
      actorRole = actorRole ?? actor.platformRole;
    }
  }
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorName: actorName ?? null,
      actorEmail: actorEmail ?? null,
      actorRole: actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  });
}