#!/usr/bin/env node
/**
 * Cross-platform Artillery runner:
 * 1) login once
 * 2) set ACCESS_TOKEN
 * 3) run the scenario
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = (process.env.TARGET || 'http://localhost:3001/api').replace(/\/+$/, '');
const EMAIL = process.env.LOGIN_EMAIL || 'admin@institute.edu';
const PASSWORD = process.env.LOGIN_PASSWORD || 'Prabodh@123';
const SCENARIO = process.argv[2] || 'scenarios/smoke.yml';
const OUT = process.argv[3] || 'reports/run.json';

async function main() {
  fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });

  console.log(`Logging in against ${TARGET} as ${EMAIL} ...`);
  const res = await fetch(`${TARGET}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error(`Login returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  if (!res.ok || !body.accessToken) {
    console.error(`Login failed (${res.status}): ${body.message || text.slice(0, 200)}`);
    process.exit(1);
  }

  const env = {
    ...process.env,
    ACCESS_TOKEN: body.accessToken,
    ARTILLERY_TARGET: TARGET,
  };

  console.log(`Running Artillery: ${SCENARIO} → ${OUT}`);
  const artilleryBin = path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'artillery.cmd' : 'artillery',
  );
  const result = spawnSync(
    artilleryBin,
    ['run', '--target', TARGET, '--output', OUT, SCENARIO],
    { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' },
  );

  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
