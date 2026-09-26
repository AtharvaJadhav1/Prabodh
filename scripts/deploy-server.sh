#!/usr/bin/env bash
#
# Build and deploy the Prabodh app on the Azure VM.
#
# Runs on the VM, invoked either by .github/workflows/deploy.yml (piped over
# stdin) or by hand:
#
#   bash scripts/deploy-server.sh --dry-run <sha>
#   bash scripts/deploy-server.sh <sha>
#
# Layout, all under DEPLOY_PATH:
#
#   Prabodh/            existing git clone (the only mutable thing here)
#   releases/<sha>/     immutable build output, one dir per deploy
#   current -> releases/<sha>
#   shared/
#     backend.env       real prod values, never touched by this script
#     frontend.env      real prod values, never touched by this script
#     storage/          persistent, symlinked into each release
#     db-backups/       dated pg_dump files, newest 5 kept
#
# Releases are built BEFORE the `current` symlink moves, so a failed build
# (including an OOM on a small VM) can never take the site down.

set -euo pipefail

# --------------------------------------------------------------------------
# Self-relocation guard.
#
# When run as `bash scripts/deploy-server.sh` from inside the clone, this
# script checks the clone out to a detached SHA, which rewrites this very file
# while bash is still reading it. Copy somewhere safe and re-exec. When the
# script arrives on stdin (`bash -s`), $0 is not a file and this is skipped,
# since stdin cannot be rewritten underneath us.
# --------------------------------------------------------------------------
if [ -z "${DEPLOY_SCRIPT_SAFE:-}" ] && [ -f "$0" ]; then
  export DEPLOY_SCRIPT_SAFE=1
  # $0 is <DEPLOY_PATH>/Prabodh/scripts/deploy-server.sh, so dirname gives
  # <DEPLOY_PATH>/Prabodh/scripts and DEPLOY_PATH is exactly two levels up.
  # Three levels (../../..) overshoots to DEPLOY_PATH's parent, which turns
  # REPO_DIR into /home/Prabodh instead of /home/azureuser/Prabodh.
  export DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
  _safe_script="$(mktemp "${TMPDIR:-/tmp}/deploy-server-XXXXXX.sh")"
  cp -- "$0" "$_safe_script"
  exec bash "$_safe_script" "$@"
fi

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
NODE_VERSION_REQUIRED='20.9.0'
API_PORT=3001
WEB_PORT=3000
KEEP_RELEASES=3
KEEP_BACKUPS=5
HEALTH_TIMEOUT_SEC=60
MIN_FREE_DISK_KB=5242880 # 5 GiB

REPO_DIR=''            # set below, needs DEPLOY_PATH
RELEASES_DIR=''
CURRENT_LINK=''
SHARED_DIR=''
BACKUP_DIR=''
RELEASE_DIR=''
PREV_RELEASE=''
DRY_RUN=0
SKIP_BACKUP=0

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33mWARN: %s\033[0m\n' "$*" >&2; }
fail() { printf '\n\033[1;31mFAIL: %s\033[0m\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# Read one KEY=value from a file without sourcing it. Values are NOT
# unquoted by the shell, so unquoted values containing spaces survive
# (e.g. RESEND_FROM_EMAIL=Prabodh <noreply@prabodh.app>).
env_get() {
  local file="$1" key="$2" line value
  line="$(grep -m1 -E "^[[:space:]]*${key}[[:space:]]*=" "$file" 2>/dev/null || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}

# Export every KEY=value in a file using the same safe parsing as env_get.
export_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac
    key="$(printf '%s' "${line%%=*}" | tr -d '[:space:]')"
    [ -n "$key" ] || continue
    value="${line#*=}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    export "$key=$value"
  done < "$file"
}

# Host portion of a postgres URL, e.g. postgres.railway.internal
# The credentials are stripped greedily so an unencoded `@` in the password
# cannot be mistaken for the separator.
db_url_host() {
  printf '%s' "$1" | sed -E 's#^[a-zA-Z0-9+]+://##; s#^.*@##; s#[:/?].*$##'
}

# Port portion of a postgres URL, or empty when absent (libpq default 5432).
db_url_port() {
  local rest
  rest="$(printf '%s' "$1" | sed -E 's#^[a-zA-Z0-9+]+://##; s#^.*@##')"
  rest="${rest%%/*}"
  case "$rest" in
    *:*) printf '%s' "${rest##*:}" ;;
    *)   printf '' ;;
  esac
}

# Prisma appends params libpq does not understand (`?schema=public`), which
# makes pg_dump reject the URL outright. Strip only the Prisma-specific ones
# so libpq params such as sslmode=require survive.
pg_dump_url() {
  local url="$1" base query pair key out=''
  case "$url" in
    # The `?` must be escaped: in parameter expansion it is a glob wildcard.
    *\?*) base="${url%%\?*}"; query="${url#*\?}" ;;
    *) printf '%s' "$url"; return 0 ;;
  esac
  local IFS='&'
  for pair in $query; do
    key="${pair%%=*}"
    case "$key" in
      schema|connection_limit|pool_timeout|pgbouncer|pgbouncer_true|statement_cache_size|max_connections)
        continue ;;
    esac
    if [ -n "$out" ]; then out="$out&$pair"; else out="$pair"; fi
  done
  if [ -n "$out" ]; then printf '%s' "$base?$out"; else printf '%s' "$base"; fi
}

# Does the running pm2 app actually resolve into the expected release?
# pm2 can cache the real path behind a symlinked `current`, which would leave
# the old release serving traffic after a cutover. pm2 jlist gives us JSON we
# can assert against, unlike the human-formatted `pm2 describe` output.
pm2_serves_release() {
  local name="$1"
  pm2 jlist 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (d) => (raw += d)).on("end", () => {
      const want = process.argv[1];
      const name = process.argv[2];
      let apps = [];
      try { apps = JSON.parse(raw); } catch (e) { process.exit(1); }
      const app = apps.find((a) => a.name === name);
      if (!app) process.exit(1);
      const paths = String(app.pm2_env.pm_cwd || "") + "|" + String(app.pm2_env.pm_exec_path || "");
      process.exit(paths.includes(want) ? 0 : 1);
    });
  ' "$RELEASE_DIR" "$name"
}

swap_current() {
  local target="$1"
  ln -sfn "$target" "${CURRENT_LINK}.tmp"
  mv -Tf "${CURRENT_LINK}.tmp" "$CURRENT_LINK"
}

# --------------------------------------------------------------------------
# Arguments
# --------------------------------------------------------------------------
SHA=''
for arg in "$@"; do
  case "$arg" in
    --dry-run)     DRY_RUN=1 ;;
    --skip-backup) SKIP_BACKUP=1 ;;
    -*)            fail "Unknown flag: $arg" ;;
    *)             SHA="$arg" ;;
  esac
done

[ -n "$SHA" ] || fail "Usage: bash scripts/deploy-server.sh [--dry-run] [--skip-backup] <sha>"
printf '%s' "$SHA" | grep -qE '^[0-9a-f]{7,40}$' || fail "Not a git SHA: $SHA"

# Last-resort fallback for `bash -s` runs where the guard above was skipped
# (stdin is not a file, so $0 is not the script). CI always passes DEPLOY_PATH
# explicitly. When running by hand this must be the directory that CONTAINS
# Prabodh/ and shared/ -- not the clone itself, or REPO_DIR gains a doubled
# Prabodh/ segment. The preflight below names DEPLOY_PATH if it is wrong.
DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
REPO_DIR="$DEPLOY_PATH/Prabodh"
RELEASES_DIR="$DEPLOY_PATH/releases"
CURRENT_LINK="$DEPLOY_PATH/current"
SHARED_DIR="$DEPLOY_PATH/shared"
BACKUP_DIR="$SHARED_DIR/db-backups"
RELEASE_DIR="$RELEASES_DIR/$SHA"

if [ -L "$CURRENT_LINK" ]; then
  PREV_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
fi

[ "$DRY_RUN" -eq 1 ] && log "DRY RUN: will build and back up, but not cut over."

# --------------------------------------------------------------------------
# 1. Preflight
# --------------------------------------------------------------------------
log "Preflight"

for cmd in git node npm pm2 curl tar pg_dump; do
  require_cmd "$cmd"
done

# Compare major and minor/patch: `next`/`sharp` need >=20.9.0, so "major is 20"
# is not sufficient. The boundary is 20.9.0 exactly, so rejecting minor < 9 is
# the whole check; anything above that major or minor passes.
node_version="$(node --version)"        # e.g. v20.20.2
node_ver="${node_version#v}"
node_major="${node_ver%%.*}"
node_rest="${node_ver#*.}"
node_minor="${node_rest%%.*}"
if [ "$node_major" -lt 20 ] || { [ "$node_major" -eq 20 ] && [ "$node_minor" -lt 9 ]; }; then
  fail "Node $node_version on this VM is older than the required $NODE_VERSION_REQUIRED (CI pins Node 20.x)."
fi
log "Node $node_version (>= $NODE_VERSION_REQUIRED OK)"

[ -d "$REPO_DIR/.git" ] || fail "Not a git clone: $REPO_DIR
  DEPLOY_PATH=$DEPLOY_PATH
  DEPLOY_PATH must be the directory that CONTAINS Prabodh/ and shared/ (e.g. /home/azureuser),
  and must be passed in when the script is piped over stdin, e.g.:
    DEPLOY_PATH=/home/azureuser bash scripts/deploy-server.sh --dry-run <sha>"
[ -f "$SHARED_DIR/backend.env" ] || fail "Missing $SHARED_DIR/backend.env — populate it before deploying (do not let this script create it)."
[ -f "$SHARED_DIR/frontend.env" ] || fail "Missing $SHARED_DIR/frontend.env — populate it before deploying."

backend_node_env="$(env_get "$SHARED_DIR/backend.env" 'NODE_ENV')"
[ "$backend_node_env" = "production" ] || fail "NODE_ENV is '$backend_node_env' in backend.env; must be 'production' (src/main.ts opens CORS to every origin when NODE_ENV != production)."

allow_dev_auth="$(env_get "$SHARED_DIR/backend.env" 'ALLOW_DEV_AUTH')"
[ "$allow_dev_auth" != "true" ] || fail "ALLOW_DEV_AUTH=true in backend.env. That enables x-dev-user-id header auth and must never be on in production."

DATABASE_URL="$(env_get "$SHARED_DIR/backend.env" 'DATABASE_URL')"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL is missing from backend.env"

# Pooled connections cannot run DDL (prisma db push, ensure-columns.cjs) and
# break pg_dump's long-running session. Railway exposes direct and pooled URLs
# on the SAME port, so the host is the only reliable signal. DB-agnostic: any
# provider whose pooled hostname contains "pooler" is caught, as is port 6432.
db_host="$(db_url_host "$DATABASE_URL")"
db_port="$(db_url_port "$DATABASE_URL")"
case "$db_host" in
  *pooler*) fail "DATABASE_URL points at a POOLED host ($db_host). Use the direct connection: pooled/PgBouncer connections cannot run prisma db push and corrupt pg_dump." ;;
esac
[ "$db_port" != "6432" ] || fail "DATABASE_URL uses port 6432, which indicates a connection pooler. Use the direct connection."
log "Database host OK (direct, not pooled): $db_host"

# Never destroy uncommitted work in the clone we are about to check out.
if [ -n "$(git -C "$REPO_DIR" status --porcelain)" ]; then
  git -C "$REPO_DIR" status --short >&2
  fail "Working tree at $REPO_DIR is dirty. Commit, stash, or clean it before deploying."
fi

free_kb="$(df -Pk "$DEPLOY_PATH" | awk 'NR==2 {print $4}')"
if [ "$free_kb" -lt "$MIN_FREE_DISK_KB" ]; then
  fail "Only $((free_kb / 1024)) MiB free under $DEPLOY_PATH; need at least $((MIN_FREE_DISK_KB / 1024)) MiB."
fi
log "Disk: $((free_kb / 1024)) MiB free"

if command -v swapon >/dev/null 2>&1; then
  log "Memory / swap:"
  free -h >&2 || true
  swapon --show >&2 || true
fi

if [ -n "$PREV_RELEASE" ]; then
  log "Previous release: $PREV_RELEASE"
else
  log "No current symlink yet — this deploy is a cold start (nothing to roll back to)."
fi

# --------------------------------------------------------------------------
# 2. Fetch
# --------------------------------------------------------------------------
log "Fetching $SHA"
# Plain fetch, not --depth=1: this is an existing full clone and a shallow
# fetch would leave the repository permanently shallow.
git -C "$REPO_DIR" fetch --no-tags origin main
if ! git -C "$REPO_DIR" cat-file -e "${SHA}^{commit}" 2>/dev/null; then
  # GitHub allows fetching an arbitrary reachable SHA.
  git -C "$REPO_DIR" fetch --no-tags origin "$SHA"
fi
git -C "$REPO_DIR" cat-file -e "${SHA}^{commit}" 2>/dev/null || fail "Commit $SHA not found in $REPO_DIR"
git -C "$REPO_DIR" checkout --detach "$SHA"
log "Checked out $(git -C "$REPO_DIR" rev-parse --short HEAD)"

# --------------------------------------------------------------------------
# 3. Stage
# --------------------------------------------------------------------------
log "Staging release"
mkdir -p "$RELEASES_DIR" "$SHARED_DIR/storage" "$BACKUP_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# git archive yields tracked files only, so gitignored .env files and
# backend/storage in the clone can never leak into a release.
git -C "$REPO_DIR" archive --format=tar "$SHA" | tar -xf - -C "$RELEASE_DIR"

# Prisma CLI and @nestjs/config both read backend/.env; the frontend reads
# .env.production at build time. No stale .env.local ships because git
# archive excludes it.
ln -sfn "$SHARED_DIR/backend.env"  "$RELEASE_DIR/backend/.env"
ln -sfn "$SHARED_DIR/frontend.env" "$RELEASE_DIR/frontend/.env.production"
# Local export fallback writes here; keep it across deploys.
ln -sfn "$SHARED_DIR/storage" "$RELEASE_DIR/backend/storage"

export_env_file "$SHARED_DIR/backend.env"
log "Staged $(find "$RELEASE_DIR" -type f | wc -l) files"

# --------------------------------------------------------------------------
# 4. Database backup — before anything can change the schema
# --------------------------------------------------------------------------
if [ "$SKIP_BACKUP" -eq 1 ]; then
  warn "Skipping database backup (--skip-backup)."
else
  # Runs even under --dry-run: pg_dump only reads, so this is the most faithful
  # test of the riskiest step, and the dump is what you would want to have.
  log "Backing up the database"
  dump_url="$(pg_dump_url "$DATABASE_URL")"
  dump_file="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:7}.dump"
  # --no-owner/--no-privileges: the app role is not the owner of every object.
  if ! pg_dump "$dump_url" --format=custom --no-owner --no-privileges --file="$dump_file"; then
    rm -f "$dump_file"
    fail "pg_dump failed. Aborting before any schema change."
  fi
  [ -s "$dump_file" ] || { rm -f "$dump_file"; fail "pg_dump produced an empty file."; }
  chmod 600 "$dump_file"
  # Newest-first, keep KEEP_BACKUPS. Scoped to $BACKUP_DIR, so release pruning
  # can never touch these.
  ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | tail -n "+$((KEEP_BACKUPS + 1))" | while IFS= read -r old; do
    rm -f -- "$old"
  done || true
  log "Backup written: $dump_file ($(du -h "$dump_file" | cut -f1))"
  warn "Cross-region note: the VM and the database are in different regions, so this dump pays network round-trip latency."
fi

# --------------------------------------------------------------------------
# 5. Build backend
# --------------------------------------------------------------------------
log "Building backend"
# --include=dev is required, not optional. export_env_file above puts
# NODE_ENV=production into this environment, and npm then defaults
# `omit` to [dev]. Without it the prisma CLI (a devDependency) is missing and
# `npx prisma db push` silently downloads a random version from the registry
# instead of failing loudly.
(
  cd "$RELEASE_DIR/backend"
  NODE_OPTIONS=--max-old-space-size=1536 npm ci --include=dev --no-audit --no-fund
  # Runs ensure-columns.cjs, then prisma db push, then tsc.
  NODE_OPTIONS=--max-old-space-size=1536 npm run build
)
[ -f "$RELEASE_DIR/backend/dist/main.js" ] || fail "Backend build produced no dist/main.js"
[ -f "$RELEASE_DIR/backend/dist/worker.js" ] || fail "Backend build produced no dist/worker.js (the BullMQ worker runs from dist)"

# --------------------------------------------------------------------------
# 6. Build frontend
# --------------------------------------------------------------------------
log "Building frontend"
# Same reason as the backend: tailwindcss, postcss and autoprefixer are
# devDependencies, and next build cannot process CSS without them.
(
  cd "$RELEASE_DIR/frontend"
  NODE_OPTIONS=--max-old-space-size=1536 npm ci --include=dev --no-audit --no-fund
  NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build
)
[ -d "$RELEASE_DIR/frontend/.next" ] || fail "Frontend build produced no .next directory"

# --------------------------------------------------------------------------
# 7. Cutover
# --------------------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  log "DRY RUN complete — build succeeded, not cutting over."
  log "Release staged at $RELEASE_DIR"
  exit 0
fi

ECOSYSTEM="$RELEASE_DIR/scripts/ecosystem.config.cjs"
[ -f "$ECOSYSTEM" ] || fail "Missing pm2 ecosystem config at $ECOSYSTEM"

log "Cutting over to $SHA"
swap_current "$RELEASE_DIR"

# RELEASE_DIR makes pm2 see a changed cwd and recreate cleanly, rather than
# reloading a process still pinned to the previous release's real path.
export RELEASE_DIR
pm2 startOrReload "$ECOSYSTEM" --update-env

# Guard against pm2 having kept a stale resolved path.
for app in sih-api sih-worker sih-web; do
  if pm2_serves_release "$app"; then
    log "$app is serving from the new release"
  else
    warn "$app did not pick up the new release — recreating it"
    pm2 describe "$app" >&2 || true
    pm2 delete "$app" || true
    pm2 start "$ECOSYSTEM" --update-env
    pm2_serves_release "$app" || fail "$app still does not resolve into $RELEASE_DIR after a fresh start."
    log "$app recreated and serving from the new release"
  fi
done

# --------------------------------------------------------------------------
# 8. Verify
# --------------------------------------------------------------------------
log "Verifying health (up to ${HEALTH_TIMEOUT_SEC}s)"
api_ok=0
web_code=''
deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
while [ "$SECONDS" -lt "$deadline" ]; do
  # /api/health runs SELECT 1, so this also catches a broken migration.
  if curl -fsS --max-time 5 "http://127.0.0.1:${API_PORT}/api/health" 2>/dev/null | grep -q '"ok":true'; then
    api_ok=1
  fi
  web_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${WEB_PORT}/" || true)"
  if [ "$api_ok" -eq 1 ] && [ "$web_code" = "200" ]; then
    break
  fi
  api_ok=0
  sleep 3
done

if [ "$api_ok" -ne 1 ] || [ "$web_code" != "200" ]; then
  printf '\n\033[1;31mHealth check failed (api_ok=%s web_code=%s)\033[0m\n' "$api_ok" "${web_code:-none}" >&2
  log "Recent pm2 logs"
  pm2 logs --lines 50 --nostream >&2 || true
else
  log "Health checks passed (API :$API_PORT ok, web :$WEB_PORT 200)"
fi

# --------------------------------------------------------------------------
# 9. Roll back, or prune
# --------------------------------------------------------------------------
if [ "$api_ok" -ne 1 ] || [ "$web_code" != "200" ]; then
  if [ -n "$PREV_RELEASE" ] && [ -d "$PREV_RELEASE" ]; then
    log "Rolling back to $PREV_RELEASE"
    swap_current "$PREV_RELEASE"
    RELEASE_DIR="$PREV_RELEASE"
    export RELEASE_DIR
    pm2 startOrReload "$PREV_RELEASE/scripts/ecosystem.config.cjs" --update-env || true
    for app in sih-api sih-worker sih-web; do
      pm2_serves_release "$app" || { pm2 delete "$app" || true; pm2 start "$PREV_RELEASE/scripts/ecosystem.config.cjs" --update-env || true; }
    done
    log "Rollback attempted. Verify manually: pm2 list && pm2 logs"
  else
    fail "COLD START: this deploy failed health checks and there is no previous release to roll back to. Fix the issue and redeploy; the site is currently down."
  fi
  # Prune before exiting so a failed deploy does not leak disk.
  # `|| true` because an empty releases dir makes ls fail, which pipefail would
  # otherwise turn into an early exit.
  ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | while IFS= read -r dir; do
    rm -rf -- "$dir"
  done || true
  exit 1
fi

log "Pruning old releases (keeping newest $KEEP_RELEASES)"
# Scoped to $RELEASES_DIR only. shared/db-backups has its own retention.
ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | while IFS= read -r dir; do
  log "Removing $dir"
  rm -rf -- "$dir"
done || true

log "Deploy complete: $SHA is live"
pm2 list
