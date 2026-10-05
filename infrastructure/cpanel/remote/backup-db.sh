#!/usr/bin/env bash
# Daily PostgreSQL backup for the cPanel server (cPanel → Cron Jobs, e.g. 02:30 every day):
#   bash ~/resource-manager/bin/backup-db.sh >> ~/resource-manager/logs/backup.log 2>&1
#
# Retention: 7 daily, 4 weekly (Sundays), 3 monthly (1st of the month).
# Each dump is verified with pg_restore --list; a failure exits non-zero (cron mails the owner).
# Environment: DEPLOY_ROOT, NODEVENV_ACTIVATE (see deploy-release.sh)
set -euo pipefail
umask 077

DEPLOY_ROOT="${DEPLOY_ROOT:-$HOME/resource-manager}"
BACKUP_ROOT="$DEPLOY_ROOT/backups"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=lib-db.sh
source "$SCRIPT_DIR/lib-db.sh"

if [ -n "${NODEVENV_ACTIVATE:-}" ]; then
  # shellcheck disable=SC1090
  source "$NODEVENV_ACTIVATE"
fi

mkdir -p "$BACKUP_ROOT"/{daily,weekly,monthly}
exec 8>"$BACKUP_ROOT/.backup.lock"
flock -n 8 || { echo "A backup is already running" >&2; exit 1; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
daily_file="$BACKUP_ROOT/daily/resource-manager-$stamp.dump"

load_database_env "$DEPLOY_ROOT/shared/api.env"
dump_database "$daily_file"

[ "$(date -u +%u)" = "7" ] && cp -p "$daily_file" "$BACKUP_ROOT/weekly/"
[ "$(date -u +%d)" = "01" ] && cp -p "$daily_file" "$BACKUP_ROOT/monthly/"

prune_dumps "$BACKUP_ROOT/daily" 7
prune_dumps "$BACKUP_ROOT/weekly" 4
prune_dumps "$BACKUP_ROOT/monthly" 3

date -u +%Y-%m-%dT%H:%M:%SZ > "$BACKUP_ROOT/last-success"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup ok $(basename "$daily_file") ($(du -h "$daily_file" | cut -f1))"
