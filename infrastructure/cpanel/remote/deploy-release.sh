#!/usr/bin/env bash
# Runs ON the cPanel server (over SSH) to install a release built and validated by the CI.
#
#   deploy-release.sh <commit-sha>
#
# Expects in $DEPLOY_ROOT/incoming/<sha>/ : api-<sha>.tar.gz, admin-<sha>.tar.gz, SHA256SUMS
# Environment:
#   DEPLOY_ROOT       default ~/resource-manager
#   API_APP_ROOT      cPanel application root of the API (Passenger)
#   ADMIN_APP_ROOT    cPanel application root of the admin (Passenger)
#   NODEVENV_ACTIVATE optional: cPanel Node.js virtualenv activate script (provides node/npm)
#   EXPECTED_APP_ENV  default production: shared/api.env must declare this APP_ENV
#
# Order: verify → install → database backup → prisma migrate deploy → atomic switch → restart.
# Nothing is switched if any step fails. Migrations are never rolled back automatically.
set -euo pipefail
umask 077

SHA="${1:?usage: deploy-release.sh <commit-sha>}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 1; }

DEPLOY_ROOT="${DEPLOY_ROOT:-$HOME/resource-manager}"
: "${API_APP_ROOT:?API_APP_ROOT is required}"
: "${ADMIN_APP_ROOT:?ADMIN_APP_ROOT is required}"
EXPECTED_APP_ENV="${EXPECTED_APP_ENV:-production}"
PNPM_VERSION="${PNPM_VERSION:-10.27.0}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

INCOMING="$DEPLOY_ROOT/incoming/$SHA"
API_RELEASE="$DEPLOY_ROOT/api/releases/$SHA"
ADMIN_RELEASE="$DEPLOY_ROOT/admin/releases/$SHA"
SHARED="$DEPLOY_ROOT/shared"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib-db.sh
source "$SCRIPT_DIR/lib-db.sh"

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }

if [ -n "${NODEVENV_ACTIVATE:-}" ]; then
  # shellcheck disable=SC1090
  source "$NODEVENV_ACTIVATE"
fi
command -v node >/dev/null || { echo "node is not available (set NODEVENV_ACTIVATE)" >&2; exit 1; }

mkdir -p "$DEPLOY_ROOT"/{api/releases,admin/releases,backups/pre-deploy,logs} "$SHARED"
exec 9>"$DEPLOY_ROOT/.deploy.lock"
flock -n 9 || { echo "Another deployment is running" >&2; exit 1; }

# ---- Configuration checks (values are never printed) ----
for file in "$SHARED/api.env" "$SHARED/admin.env"; do
  [ -f "$file" ] || { echo "Missing $file (see docs/devops/production.md)" >&2; exit 1; }
  chmod 600 "$file"
done
app_env="$(sed -n 's/^APP_ENV=//p' "$SHARED/api.env" | tail -n 1 | tr -d '"'"'"'\r')"
if [ "$app_env" != "$EXPECTED_APP_ENV" ]; then
  echo "shared/api.env declares APP_ENV=${app_env:-<empty>}, expected $EXPECTED_APP_ENV: aborting" >&2
  exit 1
fi

if [ "$(readlink "$DEPLOY_ROOT/api/current" 2>/dev/null || true)" = "$API_RELEASE" ]; then
  echo "Release ${SHA:0:7} is already live (use rollback-release.sh to switch versions)" >&2
  exit 1
fi

# ---- 1. Verify artifacts ----
log "Verifying artifacts for ${SHA:0:7}"
(cd "$INCOMING" && sha256sum -c --quiet SHA256SUMS)

# ---- 2. Unpack and install ----
for release in "$API_RELEASE" "$ADMIN_RELEASE"; do
  rm -rf "$release.tmp" && mkdir -p "$release.tmp"
done
tar -xzf "$INCOMING/api-$SHA.tar.gz" -C "$API_RELEASE.tmp"
tar -xzf "$INCOMING/admin-$SHA.tar.gz" -C "$ADMIN_RELEASE.tmp"

log "Installing API production dependencies (frozen lockfile)"
(
  cd "$API_RELEASE.tmp"
  npx --yes "pnpm@$PNPM_VERSION" install --prod --frozen-lockfile --filter api --reporter=silent
  cd apps/api
  ./node_modules/.bin/prisma generate --schema=../../prisma/schema.prisma > /dev/null
)
rm -rf "$API_RELEASE" "$ADMIN_RELEASE"
mv "$API_RELEASE.tmp" "$API_RELEASE"
mv "$ADMIN_RELEASE.tmp" "$ADMIN_RELEASE"

# ---- 3. Database backup (mandatory before migrations) ----
log "Backing up the database before migrations"
BACKUP_FILE="$DEPLOY_ROOT/backups/pre-deploy/$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:7}.dump"
(
  load_database_env "$SHARED/api.env"
  dump_database "$BACKUP_FILE"
)
log "Backup verified: $(basename "$BACKUP_FILE")"

# ---- 4. Migrations: migrate deploy only ----
log "Applying pending migrations (prisma migrate deploy)"
(
  set -a
  # shellcheck disable=SC1091
  source "$SHARED/api.env"
  set +a
  cd "$API_RELEASE/apps/api"
  ./node_modules/.bin/prisma migrate deploy --schema=../../prisma/schema.prisma
)

# ---- 5. Atomic switch ----
switch_current() {
  local app_dir="$1" release="$2"
  if [ -L "$app_dir/current" ]; then
    readlink "$app_dir/current" > "$app_dir/previous"
  fi
  ln -sfn "$release" "$app_dir/current.new"
  mv -Tf "$app_dir/current.new" "$app_dir/current"
}
log "Switching to ${SHA:0:7}"
switch_current "$DEPLOY_ROOT/api" "$API_RELEASE"
switch_current "$DEPLOY_ROOT/admin" "$ADMIN_RELEASE"

# ---- 6. Refresh server scripts, then restart Passenger applications ----
mkdir -p "$DEPLOY_ROOT/bin"
install -m 700 "$SCRIPT_DIR"/*.sh "$DEPLOY_ROOT/bin/"
install -m 644 "$SCRIPT_DIR/../entry/api.cjs" "$API_APP_ROOT/app.cjs"
install -m 644 "$SCRIPT_DIR/../entry/admin.cjs" "$ADMIN_APP_ROOT/app.cjs"
for app_root in "$API_APP_ROOT" "$ADMIN_APP_ROOT"; do
  mkdir -p "$app_root/tmp"
  touch "$app_root/tmp/restart.txt"
done

printf '%s %s deployed\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SHA" >> "$DEPLOY_ROOT/logs/deploy-history.log"

# ---- 7. Cleanup: keep the most recent releases, never current/previous ----
cleanup_releases() {
  local app_dir="$1" current previous
  current="$(readlink "$app_dir/current" || true)"
  previous="$(cat "$app_dir/previous" 2>/dev/null || true)"
  find "$app_dir/releases" -mindepth 1 -maxdepth 1 -type d ! -name '*.tmp' -printf '%T@ %p\n' |
    sort -rn | tail -n +"$((KEEP_RELEASES + 1))" | cut -d' ' -f2- |
    while read -r old; do
      if [ "$old" != "$current" ] && [ "$old" != "$previous" ]; then
        rm -rf "$old"
      fi
    done
}
cleanup_releases "$DEPLOY_ROOT/api"
cleanup_releases "$DEPLOY_ROOT/admin"
rm -rf "$INCOMING"
prune_dumps "$DEPLOY_ROOT/backups/pre-deploy" 10

log "Release ${SHA:0:7} installed"
