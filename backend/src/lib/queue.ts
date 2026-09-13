import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let connection: IORedis | null = null;

export function getRedis(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export const QUEUE_NOTIFICATION = 'notifications';
export const QUEUE_EXPORT = 'exports';
export const QUEUE_REMINDER = 'reminders';
export const QUEUE_AGGREGATE = 'aggregations';

export function notificationQueue() {
  return new Queue(QUEUE_NOTIFICATION, { connection: getRedis() });
}

export function exportQueue() {
  return new Queue(QUEUE_EXPORT, { connection: getRedis() });
}

export function reminderQueue() {
  return new Queue(QUEUE_REMINDER, { connection: getRedis() });
}

export function aggregateQueue() {
  return new Queue(QUEUE_AGGREGATE, { connection: getRedis() });
}

export type NotificationJob = {
  template: 'mentor_allocation' | 'team_invite' | 'deadline_reminder' | 'evaluation_published' | 'admin_broadcast' | 'status_change' | 'ps_review';
  recipientUserId: string;
  recipientEmail: string;
  title: string;
  body: string;
  relatedEntity?: string;
};

export type ExportJobPayload = {
  jobId: string;
  format: 'xlsx' | 'pdf';
  dataset: 'teams' | 'submissions' | 'evaluations';
};

export type AggregateJobPayload = {
  teamId: string;
  stageId: string;
};
