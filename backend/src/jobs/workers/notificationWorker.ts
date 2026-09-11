import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { sendTransactionalEmail } from '../../lib/resend';
import { NotificationJob } from '../../lib/queue';
import { renderEmail } from '../../modules/notifications/templates/render';

const prisma = new PrismaClient();

export async function handleNotificationJob(job: Job<NotificationJob>) {
  const data = job.data;
  const html = renderEmail(data.template, data.title, data.body);
  const log = await prisma.notificationLog.create({
    data: {
      recipientUserId: data.recipientUserId,
      recipientEmail: data.recipientEmail,
      template: data.template,
      status: 'queued',
    },
  });
  try {
    const messageId = await sendTransactionalEmail({
      to: data.recipientEmail,
      subject: data.title,
      html,
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'sent',
        providerMessageId: messageId,
        sentAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'failed' },
    });
    throw err;
  }
}
