#!/usr/bin/env bash
# Runs ON the cPanel server: switches the API and the admin back to an installed release.
#
#   rollback-release.sh [<commit-sha>]   (default: the previous release)
#
# Environment: DEPLOY_ROOT, API_APP_ROOT, ADMIN_APP_ROOT (see deploy-release.sh)
#
# Database migrations are NOT reverted. Rolling back over a migration is only safe when that
# migration was backward compatible (expand/contract); otherwise restore the pre-deploy backup
# following docs/devops/production.md — never blindly.
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-$HOME/resource-manager}"
: "${API_APP_ROOT:?API_APP_ROOT is required}"
: "${ADMIN_APP_ROOT:?ADMIN_APP_ROOT is required}"

if [ -n "${1:-}" ]; then
  [[ "$1" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 1; }
  TARGET_SHA="$1"
else
  previous="$(cat "$DEPLOY_ROOT/api/previous" 2>/dev/null || true)"
  [ -n "$previous" ] || { echo "No previous release recorded" >&2; exit 1; }
  TARGET_SHA="$(basename "$previous")"
fi

exec 9>"$DEPLOY_ROOT/.deploy.lock"
flock -n 9 || { echo "A deployment is running" >&2; exit 1; }

for app in api admin; do
  [ -d "$DEPLOY_ROOT/$app/releases/$TARGET_SHA" ] || {
    echo "Release ${TARGET_SHA:0:7} is not installed for $app" >&2
    exit 1
  }
done

if [ "$(readlink "$DEPLOY_ROOT/api/current" 2>/dev/null || true)" = "$DEPLOY_ROOT/api/releases/$TARGET_SHA" ]; then
  echo "Release ${TARGET_SHA:0:7} is already live" >&2
  exit 1
fi

for app in api admin; do
  app_dir="$DEPLOY_ROOT/$app"
  readlink "$app_dir/current" > "$app_dir/previous"
  ln -sfn "$app_dir/releases/$TARGET_SHA" "$app_dir/current.new"
  mv -Tf "$app_dir/current.new" "$app_dir/current"
done

for app_root in "$API_APP_ROOT" "$ADMIN_APP_ROOT"; do
  mkdir -p "$app_root/tmp"
  touch "$app_root/tmp/restart.txt"
done

printf '%s %s rollback\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TARGET_SHA" >> "$DEPLOY_ROOT/logs/deploy-history.log"
echo "Rolled back to ${TARGET_SHA:0:7} (database migrations unchanged)"
