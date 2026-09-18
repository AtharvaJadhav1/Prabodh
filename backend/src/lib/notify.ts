import { NotificationType } from '@prisma/client';
import { notificationQueue, NotificationJob } from './queue';
import { PrismaService } from './prisma.service';

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  relatedEntity?: string;
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
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      relatedEntity: payload.relatedEntity,
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