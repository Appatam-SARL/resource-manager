#!/usr/bin/env bash
# Tests for render-deploy.sh / wait-for-release.sh against a running local stack.
# Starts a fake Render deploy hook on 127.0.0.1:9999; requires bash, curl, jq and node.
#
#   SHA=<commit served by the stack> TARGET=http://host.docker.internal:8088 \
#     bash infrastructure/scripts/tests/deploy-scripts.test.sh
set -uo pipefail

: "${SHA:?SHA is required}"
TARGET="${TARGET:-http://localhost:8088}"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"
HOOK='http://127.0.0.1:9999/deploy/srv-test?key=FAKE-SECRET-KEY'
failures=0

node -e "
require('http').createServer((req, res) => {
  const url = new URL(req.url, 'http://mock');
  console.error('[fake render] ' + req.method + ' imgURL=' + url.searchParams.get('imgURL'));
  res.end('ok');
}).listen(9999);
" &
mock_pid=$!
trap 'kill "$mock_pid" 2>/dev/null' EXIT
sleep 1

expect() {
  local name="$1" expected_exit="$2" log="$3"; shift 3
  local output exit_code
  output="$("$@" 2>&1)"; exit_code=$?
  printf '%s\n' "$output" > "$log"
  if [ "$exit_code" -ne "$expected_exit" ]; then
    echo "FAIL $name (exit $exit_code, expected $expected_exit)"; failures=$((failures + 1)); return
  fi
  if grep -q 'FAKE-SECRET-KEY' "$log"; then
    echo "FAIL $name (deploy hook secret printed)"; failures=$((failures + 1)); return
  fi
  echo "ok   $name"
}

tmp="$(mktemp -d)"

expect "API: bon commit → succès" 0 "$tmp/1" env \
  RENDER_DEPLOY_HOOK="$HOOK" IMAGE="ghcr.io/test/resource-manager-api:$SHA" \
  CHECK_URL="$TARGET/api/v1/health" EXPECTED_COMMIT="$SHA" REQUIRE_TEXT='"status":"ok"' \
  TIMEOUT_SECONDS=30 bash "$SCRIPTS/render-deploy.sh"

expect "Admin: bon commit → succès" 0 "$tmp/2" env \
  RENDER_DEPLOY_HOOK="$HOOK" IMAGE="ghcr.io/test/resource-manager-admin:$SHA" \
  CHECK_URL="$TARGET/login" EXPECTED_COMMIT="$SHA" TIMEOUT_SECONDS=30 \
  bash "$SCRIPTS/render-deploy.sh"

expect "Mauvais commit → échec au timeout" 1 "$tmp/3" env \
  RENDER_DEPLOY_HOOK="$HOOK" IMAGE="ghcr.io/test/x:deadbeef" \
  CHECK_URL="$TARGET/api/v1/health" EXPECTED_COMMIT=deadbeefdeadbeef TIMEOUT_SECONDS=20 \
  bash "$SCRIPTS/render-deploy.sh"

expect "Attente seule (Vercel): bon commit → succès" 0 "$tmp/4" env \
  CHECK_URL="$TARGET/login" EXPECTED_COMMIT="$SHA" TIMEOUT_SECONDS=30 \
  bash "$SCRIPTS/wait-for-release.sh"

expect "Hook manquant → refus" 1 "$tmp/5" env \
  IMAGE="x" CHECK_URL="$TARGET" EXPECTED_COMMIT="$SHA" bash "$SCRIPTS/render-deploy.sh"

echo "---"
[ "$failures" -eq 0 ] && echo "Tous les tests passent" || echo "$failures test(s) en échec"
exit "$failures"
