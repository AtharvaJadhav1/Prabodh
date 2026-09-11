import { Worker } from 'bullmq';
import { getRedis, QUEUE_EXPORT, QUEUE_NOTIFICATION, QUEUE_REMINDER } from './lib/queue';
import { handleExportJob } from './jobs/workers/exportWorker';
import { handleNotificationJob } from './jobs/workers/notificationWorker';
import { handleReminderTick } from './jobs/workers/reminderWorker';
import { reminderQueue } from './lib/queue';

async function main() {
  const connection = getRedis();

  new Worker(QUEUE_NOTIFICATION, handleNotificationJob, { connection });
  new Worker(QUEUE_EXPORT, handleExportJob, { connection });
  new Worker(QUEUE_REMINDER, async () => handleReminderTick(), { connection });

  await reminderQueue().add('tick', {}, { repeat: { every: 15 * 60 * 1000 } });
  console.log('SIH workers started (notifications, exports, reminders)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
