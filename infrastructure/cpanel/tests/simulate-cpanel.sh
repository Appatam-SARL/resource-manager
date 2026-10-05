#!/usr/bin/env bash
# End-to-end test of the cPanel release scripts on a simulated host (Debian, Node 22, pg_dump 16,
# non-root user, no Docker, no Passenger: the apps are started directly from their app.cjs).
#
# Run from the repository root (local Docker stack up, release packaged into the rm-cpanel-sim volume):
#   docker run --rm --network resource-manager-local_internal ... (see docs/devops/production.md)
#
# Mounts: /repo (read-only checkout, provides .env.docker), /out/incoming/<sha> (packaged release).
set -euo pipefail

SHA_A="${1:?usage: simulate-cpanel.sh <packaged-sha>}"
SHA_B="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
USER_HOME=/home/node
DEPLOY_ROOT="$USER_HOME/resource-manager"
API_APP_ROOT="$USER_HOME/apps/api"
ADMIN_APP_ROOT="$USER_HOME/apps/admin"
LOG=/tmp/simulation.log
failures=0

pass() { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; failures=$((failures + 1)); }
as_user() {
  runuser -u node -- env HOME="$USER_HOME" DEPLOY_ROOT="$DEPLOY_ROOT" \
    API_APP_ROOT="$API_APP_ROOT" ADMIN_APP_ROOT="$ADMIN_APP_ROOT" "$@"
}
live_sha() { basename "$(readlink "$DEPLOY_ROOT/api/current")"; }

echo "== Host tooling (PGDG postgresql-client-16)"
apt-get update -qq > /dev/null
apt-get install -y -qq curl ca-certificates procps > /dev/null 2>&1
install -d /usr/share/postgresql-common/pgdg
curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -qq > /dev/null
apt-get install -y -qq postgresql-client-16 > /dev/null 2>&1
pg_dump --version

echo "== Server layout (shared env files derived from .env.docker, never printed)"
mkdir -p "$DEPLOY_ROOT/shared" "$DEPLOY_ROOT/incoming" "$API_APP_ROOT" "$ADMIN_APP_ROOT"
cp -r "/out/incoming/$SHA_A" "$DEPLOY_ROOT/incoming/"
rm -rf "$DEPLOY_ROOT/incoming/$SHA_A/cpanel"
cp -r /repo/infrastructure/cpanel "$DEPLOY_ROOT/incoming/$SHA_A/cpanel"
{
  grep -E '^(DATABASE_URL|JWT_[A-Z_]+)=' /repo/.env.docker
  echo "APP_ENV=production"
  echo "NODE_ENV=production"
  echo "PORT=3100"
  echo "CORS_ORIGIN=http://127.0.0.1:3101"
  echo "TRUST_PROXY_HOPS=1"
} > "$DEPLOY_ROOT/shared/api.env"
{
  echo "APP_ENV=production"
  echo "API_PUBLIC_URL=http://127.0.0.1:3100"
  echo "PORT=3101"
  echo "HOSTNAME=127.0.0.1"
} > "$DEPLOY_ROOT/shared/admin.env"
chown -R node:node "$USER_HOME"

# Release B = release A relabelled, to exercise a second deployment and the rollback.
work="$(mktemp -d)"
mkdir -p "$DEPLOY_ROOT/incoming/$SHA_B/cpanel" "$work/api" "$work/admin"
cp -r "$DEPLOY_ROOT/incoming/$SHA_A/cpanel/." "$DEPLOY_ROOT/incoming/$SHA_B/cpanel/"
for app in api admin; do
  tar -xzf "$DEPLOY_ROOT/incoming/$SHA_A/$app-$SHA_A.tar.gz" -C "$work/$app"
  sed -i "s/$SHA_A/$SHA_B/" "$work/$app/release.json"
  tar -czf "$DEPLOY_ROOT/incoming/$SHA_B/$app-$SHA_B.tar.gz" -C "$work/$app" .
done
(cd "$DEPLOY_ROOT/incoming/$SHA_B" && sha256sum ./*.tar.gz | sed 's: \./: :' > SHA256SUMS)
rm -rf "$work"
chown -R node:node "$DEPLOY_ROOT"

API_PID=""
ADMIN_PID=""
start_apps() {
  as_user node "$API_APP_ROOT/app.cjs" >> "$LOG" 2>&1 & API_PID=$!
  as_user node "$ADMIN_APP_ROOT/app.cjs" >> "$LOG" 2>&1 & ADMIN_PID=$!
  for _ in $(seq 1 60); do
    curl -fsS http://127.0.0.1:3100/api/v1/health > /dev/null 2>&1 &&
      curl -fsS http://127.0.0.1:3101/login > /dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}
stop_apps() {
  # next-server renames its process title: stop everything the deploy user runs.
  pkill -u node || true
  wait "$API_PID" "$ADMIN_PID" 2> /dev/null || true
}
check_live() {
  local expected="$1" health
  if ! start_apps; then fail "apps did not start for ${expected:0:7}"; stop_apps; return; fi
  health="$(curl -fsS http://127.0.0.1:3100/api/v1/health)"
  if printf '%s' "$health" | grep -qF "\"commit\":\"$expected\"" &&
    printf '%s' "$health" | grep -qF '"status":"ok"' &&
    printf '%s' "$health" | grep -qF '"environment":"production"'; then
    pass "API health ok, environment production, commit ${expected:0:7}"
  else
    fail "unexpected API health: $health"
  fi
  if curl -fsS http://127.0.0.1:3101/login | grep -qF "$expected"; then
    pass "admin /login serves commit ${expected:0:7}"
  else
    fail "admin /login does not expose ${expected:0:7}"
  fi
  stop_apps
}

echo "== 1. First deployment (${SHA_A:0:7})"
if as_user bash "$DEPLOY_ROOT/incoming/$SHA_A/cpanel/remote/deploy-release.sh" "$SHA_A" >> "$LOG" 2>&1; then
  pass "deploy-release.sh succeeded"
else
  fail "deploy-release.sh failed"; tail -n 30 "$LOG"; exit 1
fi
[ "$(live_sha)" = "$SHA_A" ] && pass "current → ${SHA_A:0:7}" || fail "current is $(live_sha)"
[ -f "$API_APP_ROOT/app.cjs" ] && [ -f "$API_APP_ROOT/tmp/restart.txt" ] && pass "entry file + Passenger restart" || fail "entry/restart missing"
[ -x "$DEPLOY_ROOT/bin/backup-db.sh" ] && pass "server scripts installed in bin/" || fail "bin/ scripts missing"
[ "$(find "$DEPLOY_ROOT/backups/pre-deploy" -name '*.dump' | wc -l)" = 1 ] && pass "pre-deploy backup taken" || fail "no pre-deploy backup"
[ "$(stat -c %a "$DEPLOY_ROOT/backups/pre-deploy/"*.dump)" = 600 ] && pass "backup is chmod 600" || fail "backup permissions"
[ ! -d "$DEPLOY_ROOT/incoming/$SHA_A" ] && pass "incoming cleaned" || fail "incoming not cleaned"
check_live "$SHA_A"

echo "== 2. Second deployment (${SHA_B:0:7})"
as_user env KEEP_RELEASES=1 bash "$DEPLOY_ROOT/incoming/$SHA_B/cpanel/remote/deploy-release.sh" "$SHA_B" >> "$LOG" 2>&1 &&
  pass "deploy-release.sh succeeded (KEEP_RELEASES=1)" || fail "second deployment failed"
[ "$(live_sha)" = "$SHA_B" ] && pass "current → ${SHA_B:0:7}" || fail "current is $(live_sha)"
[ "$(cat "$DEPLOY_ROOT/api/previous")" = "$DEPLOY_ROOT/api/releases/$SHA_A" ] && pass "previous → ${SHA_A:0:7}" || fail "previous not recorded"
[ -d "$DEPLOY_ROOT/api/releases/$SHA_A" ] && [ -d "$DEPLOY_ROOT/admin/releases/$SHA_A" ] &&
  pass "pruning keeps the previous release (rollback target)" || fail "previous release was pruned"
check_live "$SHA_B"

# expect_refusal <description> <expected message> <command…>: must fail, for the expected reason.
expect_refusal() {
  local description="$1" expected="$2" output
  shift 2
  if output="$(as_user "$@" 2>&1)"; then
    fail "$description: accepted"
  elif printf '%s' "$output" | grep -qF -- "$expected"; then
    pass "$description"
  else
    fail "$description: refused for another reason: $output"
  fi
  printf '%s\n' "$output" >> "$LOG"
}

echo "== 3. Guards"
expect_refusal "redeploying the live release is refused" "already live" \
  bash "$DEPLOY_ROOT/bin/deploy-release.sh" "$SHA_B"
expect_refusal "APP_ENV mismatch (preprod run against production env) is refused" "expected preprod" \
  env EXPECTED_APP_ENV=preprod bash "$DEPLOY_ROOT/bin/deploy-release.sh" "$SHA_A"
corrupt="cccccccccccccccccccccccccccccccccccccccc"
mkdir -p "$DEPLOY_ROOT/incoming/$corrupt"
echo "tampered" > "$DEPLOY_ROOT/incoming/$corrupt/api-$corrupt.tar.gz"
echo "tampered" > "$DEPLOY_ROOT/incoming/$corrupt/admin-$corrupt.tar.gz"
echo "0000000000000000000000000000000000000000000000000000000000000000  api-$corrupt.tar.gz" > "$DEPLOY_ROOT/incoming/$corrupt/SHA256SUMS"
chown -R node:node "$DEPLOY_ROOT/incoming"
expect_refusal "tampered archive is refused" "FAILED" \
  bash "$DEPLOY_ROOT/bin/deploy-release.sh" "$corrupt"
[ "$(live_sha)" = "$SHA_B" ] && pass "live release untouched after the refusals" || fail "live release changed"
expect_refusal "invalid SHA is refused" "Invalid commit SHA" \
  bash "$DEPLOY_ROOT/bin/deploy-release.sh" "not-a-sha"

echo "== 4. Rollback"
as_user bash "$DEPLOY_ROOT/bin/rollback-release.sh" >> "$LOG" 2>&1 && pass "rollback-release.sh succeeded" || fail "rollback failed"
[ "$(live_sha)" = "$SHA_A" ] && pass "current → ${SHA_A:0:7}" || fail "current is $(live_sha)"
expect_refusal "rollback to the live release is refused" "already live" \
  bash "$DEPLOY_ROOT/bin/rollback-release.sh" "$SHA_A"
check_live "$SHA_A"

echo "== 5. Scheduled backup"
as_user bash "$DEPLOY_ROOT/bin/backup-db.sh" >> "$LOG" 2>&1 && pass "backup-db.sh succeeded" || fail "backup-db.sh failed"
[ "$(find "$DEPLOY_ROOT/backups/daily" -name '*.dump' | wc -l)" = 1 ] && pass "daily dump written" || fail "no daily dump"
[ -f "$DEPLOY_ROOT/backups/last-success" ] && pass "last-success marker written" || fail "no last-success marker"
restore_db="restore_check_$$"
(
  # shellcheck source=infrastructure/cpanel/remote/lib-db.sh
  source "$DEPLOY_ROOT/bin/lib-db.sh"
  load_database_env "$DEPLOY_ROOT/shared/api.env"
  createdb "$restore_db"
  pg_restore --no-owner --dbname="$restore_db" "$(find "$DEPLOY_ROOT/backups/daily" -name '*.dump' | head -n 1)"
  count="$(psql -d "$restore_db" -tAc 'select count(*) from _prisma_migrations')"
  dropdb "$restore_db"
  [ "$count" -gt 0 ]
) >> "$LOG" 2>&1 && pass "dump restores into a scratch database (migrations table present)" || fail "restore test failed"

echo "== 6. No secret in the deployment output"
leaked=0
while IFS='=' read -r key value; do
  case "$key" in DATABASE_URL | JWT_ACCESS_SECRET | JWT_REFRESH_SECRET) ;; *) continue ;; esac
  grep -qF -- "$value" "$LOG" && { leaked=1; echo "  leaked: $key"; }
done < "$DEPLOY_ROOT/shared/api.env"
password="$(sed -n 's/^DATABASE_URL=//p' "$DEPLOY_ROOT/shared/api.env" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(decodeURIComponent(new URL(s.trim()).password)))')"
grep -qF -- "$password" "$LOG" && { leaked=1; echo "  leaked: database password"; }
[ "$leaked" = 0 ] && pass "no secret printed ($(wc -l < "$LOG") log lines checked)" || fail "secret leaked"

echo
if [ "$failures" = 0 ]; then echo "ALL CHECKS PASSED"; else echo "$failures CHECK(S) FAILED"; exit 1; fi
