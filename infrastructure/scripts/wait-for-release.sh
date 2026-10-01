#!/usr/bin/env bash
# Polls a public URL until it reports the expected commit (any hosting provider).
#
#   CHECK_URL        URL to poll (API: /api/v1/health, admin: /login)
#   EXPECTED_COMMIT  commit SHA the response must contain
#   REQUIRE_TEXT     optional extra text the response must contain (e.g. "status":"ok")
#   TIMEOUT_SECONDS  optional, default 900
#
# The API reports its commit in /api/v1/health; the admin embeds it in its runtime config script.
set -euo pipefail

: "${CHECK_URL:?CHECK_URL is required}"
: "${EXPECTED_COMMIT:?EXPECTED_COMMIT is required}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"
REQUIRE_TEXT="${REQUIRE_TEXT:-}"

echo "Waiting for ${CHECK_URL} to report commit ${EXPECTED_COMMIT:0:7} (timeout ${TIMEOUT_SECONDS}s)"
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
while [ "$(date +%s)" -lt "${deadline}" ]; do
  body="$(curl -sS --max-time 10 "${CHECK_URL}" 2>/dev/null || true)"
  if printf '%s' "${body}" | grep -qF "${EXPECTED_COMMIT}" \
    && { [ -z "${REQUIRE_TEXT}" ] || printf '%s' "${body}" | grep -qF "${REQUIRE_TEXT}"; }; then
    echo "Release ${EXPECTED_COMMIT:0:7} is live on ${CHECK_URL}"
    exit 0
  fi
  sleep 15
done

echo "::error::${CHECK_URL} did not report commit ${EXPECTED_COMMIT:0:7} within ${TIMEOUT_SECONDS}s"
exit 1
