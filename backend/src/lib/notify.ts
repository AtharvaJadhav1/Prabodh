import { NotificationType } from '@prisma/client';
import { notificationQueue, NotificationJob } from './queue';
import { PrismaService } from './prisma.service';
import { NotificationAction, normalizeAction } from './notification-actions';

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  relatedEntity?: string;
  /** Optional structured action (accept/decline from the bell). Invalid actions are silently dropped. */
  action?: NotificationAction;
};

async function resolveUsers(prisma: PrismaService, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return [];
  return prisma.user.findMany({ where: { id: { in: unique } } });
}

/** In-app notification only (bell + badges). Does not enqueue an email. */
export async function createNotifications(
  prisma: PrismaService,
  userIds: string[],
  payload: NotificationInput,
) {
  const users = await resolveUsers(prisma, userIds);
  if (!users.length) return;
  const action = normalizeAction(payload.action);
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      relatedEntity: payload.relatedEntity,
      ...(action ? { actionKind: action.kind, actionRef: action.ref } : {}),
    })),
  });
}

export async function notifyUsers(
  prisma: PrismaService,
  userIds: string[],
  payload: NotificationInput & { template: NotificationJob['template'] },
) {
  const users = await resolveUsers(prisma, userIds);
  if (!users.length) return;
  await createNotifications(
    prisma,
    users.map((u) => u.id),
    payload,
  );
  await notificationQueue().addBulk(
    users.map((u) => ({
      name: 'send',
      data: {
        template: payload.template,
        recipientUserId: u.id,
        recipientEmail: u.email,
        title: payload.title,
        body: payload.body,
        relatedEntity: payload.relatedEntity,
      },
    })),
  );
}