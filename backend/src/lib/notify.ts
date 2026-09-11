import { NotificationType } from '@prisma/client';
import { notificationQueue, NotificationJob } from './queue';
import { PrismaService } from './prisma.service';

export async function notifyUsers(
  prisma: PrismaService,
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    body: string;
    relatedEntity?: string;
    template: NotificationJob['template'];
  },
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  const users = await prisma.user.findMany({ where: { id: { in: unique } } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      relatedEntity: payload.relatedEntity,
    })),
  });
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