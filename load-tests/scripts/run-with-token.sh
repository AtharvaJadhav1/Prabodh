#!/usr/bin/env bash
# Fetch a JWT once, then run an Artillery scenario with ACCESS_TOKEN set.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${TARGET:-http://localhost:3001/api}"
TARGET="${TARGET%/}"
EMAIL="${LOGIN_EMAIL:-admin@institute.edu}"
PASSWORD="${LOGIN_PASSWORD:-Prabodh@123}"
SCENARIO="${1:-scenarios/smoke.yml}"
OUT="${2:-reports/run.json}"

mkdir -p "$ROOT/reports"

echo "Logging in against $TARGET as $EMAIL ..."
TOKEN="$(
  curl -sS -X POST "$TARGET/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d); if(!j.accessToken){console.error(d); process.exit(1)}; process.stdout.write(j.accessToken)})'
)"

export ACCESS_TOKEN="$TOKEN"
export ARTILLERY_TARGET="$TARGET"

echo "Running Artillery: $SCENARIO → $OUT"
cd "$ROOT"
npx artillery run --target "$TARGET" --output "$OUT" "$SCENARIO"
