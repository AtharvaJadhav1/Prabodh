/**
 * pm2 process definitions for the Prabodh app.
 *
 * Ports are fixed to match the nginx reverse proxy already live on the VM:
 *   /api/ -> 127.0.0.1:3001   (sih-api)
 *   /     -> 127.0.0.1:3000   (sih-web)
 * This script does not touch nginx.
 *
 * `cwd` resolves from RELEASE_DIR, which scripts/deploy-server.sh exports
 * before calling `pm2 startOrReload`. That absolute, per-release path is what
 * stops pm2 from serving a previous release out of its cached `current`
 * resolution. Falling back to './current' keeps `pm2 start ecosystem.config.cjs`
 * working by hand from DEPLOY_PATH.
 *
 * instances is 1 everywhere on purpose: the VM has 842 MB of RAM, so a second
 * clustered instance of the API or the web process risks swap thrashing.
 * exec_mode 'cluster' is still what makes `pm2 reload` a graceful, zero-
 * downtime cutover; 'fork' would restart in place and drop requests.
 */

const path = require('node:path');

const base = process.env.RELEASE_DIR
  ? path.resolve(process.env.RELEASE_DIR)
  : './current';

module.exports = {
  apps: [
    {
      name: 'sih-api',
      cwd: path.join(base, 'backend'),
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 1,
      // dotenv does not override real env vars, so these win over backend/.env.
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Backstop against runaway memory on a small VM. Set high enough not to
      // fire in normal operation; lower it if the box starts swapping.
      max_memory_restart: '600M',
      // Give in-flight requests time to finish before SIGKILL.
      kill_timeout: 10000,
    },
    {
      name: 'sih-worker',
      cwd: path.join(base, 'backend'),
      // Compiled from src/worker.ts by the backend build. Deliberately not
      // `npm run start:worker`, which is `tsx watch` and dev-only.
      script: 'dist/worker.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      kill_timeout: 10000,
    },
    {
      name: 'sih-web',
      cwd: path.join(base, 'frontend'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'cluster',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        // Explicit, so a PORT inherited from the exported backend.env (3001)
        // can never collide with the API on this box.
        PORT: '3000',
      },
      // A single instance binds :3000 directly, which nginx already expects.
      max_memory_restart: '600M',
      kill_timeout: 10000,
    },
  ],
};
