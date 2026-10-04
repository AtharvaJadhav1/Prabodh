import { Prisma } from '@prisma/client';

type AuditInput = {
  /** Null is allowed for actions whose actor is the subject and may not survive the action (self-delete). */
  actorUserId: string | null;
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
  // Skipped when there is no actor id to look up (self-delete) or when the snapshot is
  // already complete; either way there is nothing left to resolve.
  if (input.actorUserId && (actorName == null || actorEmail == null || actorRole == null)) {
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