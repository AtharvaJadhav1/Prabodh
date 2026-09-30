import { Queue } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;
let cacheClient: Redis | null = null;

/**
 * Hosting dashboards (Azure App Settings), CI secret stores and `export REDIS_URL="..."` all tend to bake
 * the wrapping quotes into the value. A quoted URL makes `new URL()` throw, so ioredis
 * ends up with host/port `undefined` and loops on `connect EINVAL` every 2s — and
 * `startsWith('rediss://')` silently returns false, disabling TLS. Strip the quotes and
 * validate once so a bad value fails loudly at boot instead of drowning the log.
 */
function normalizeRedisUrl(raw: string): string {
  const url = raw.trim().replace(/^(['"])(.*)\1$/, '$2');
  try {
    new URL(url);
  } catch {
    throw new Error(
      'REDIS_URL is not a valid redis:// or rediss:// URL. ' +
        'Check for wrapping quotes in the environment, e.g. REDIS_URL="rediss://..."',
    );
  }
  return url;
}

function createRedis(overrides: RedisOptions): Redis {
  const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379');

  const client = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    enableReadyCheck: false,
    connectTimeout: 10000,
    retryStrategy(times) {
      return Math.min(times * 150, 2000);
    },
    ...overrides,
  });

  // Catches ECONNRESET so Node does not crash when Upstash drops idle connections.
  // A reconnect loop repeats the same message forever, so only log on change.
  let lastNotice = '';
  client.on('error', (err: any) => {
    if (err?.code === 'ECONNRESET') return;
    const msg = err.message || String(err);
    if (msg === lastNotice) return;
    lastNotice = msg;
    console.warn('[ioredis notice]:', msg);
  });

  return client;
}

/** Shared connection for BullMQ, which requires `maxRetriesPerRequest: null`. */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = createRedis({ maxRetriesPerRequest: null });
  }
  return redisClient;
}

/**
 * Connection for request-path commands (rate limiting, OTP). The BullMQ client queues
 * commands forever while Redis is unreachable, which leaves HTTP requests hanging until
 * the proxy drops them; this one rejects immediately so callers can fall back or error.
 */
export function getCacheRedis(): Redis {
  if (!cacheClient) {
    cacheClient = createRedis({
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      commandTimeout: 2000,
    });
  }
  return cacheClient;
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
  template:
    | 'mentor_allocation'
    | 'team_invite'
    | 'evaluation_published'
    | 'admin_broadcast'
    | 'status_change'
    | 'ps_review'
    | 'join_request'
    | 'join_request_outcome'
    | 'otp'
    | 'staff_credentials';
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
