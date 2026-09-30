/**
 * Azure App Service (Linux) env vars are case-sensitive, and settings are often typed by hand
 * (e.g. `DataBase_URL`, `Redis_Host`). Normalise them before anything reads process.env so the
 * app boots with whatever casing was configured. Import this module first in main.ts.
 */
for (const key of Object.keys(process.env)) {
  const upper = key.toUpperCase();
  if (upper !== key && process.env[upper] === undefined) {
    process.env[upper] = process.env[key];
  }
}

// Azure Cache for Redis is usually configured as separate host/port/password settings.
if (!process.env.REDIS_URL && process.env.REDIS_HOST) {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT ?? '6380';
  const password = process.env.REDIS_PASSWORD ? `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@` : '';
  // 6380 is Azure's TLS port; 6379 is plain.
  const scheme = port === '6379' ? 'redis' : 'rediss';
  process.env.REDIS_URL = `${scheme}://${password}${host}:${port}`;
}
