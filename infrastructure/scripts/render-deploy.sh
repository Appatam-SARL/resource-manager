#!/usr/bin/env bash
# Deploys a prebuilt image to a Render "image" service, then waits until the new release answers.
#
#   RENDER_DEPLOY_HOOK  secret deploy hook URL of the Render service (never printed)
#   IMAGE               full image reference, e.g. ghcr.io/org/resource-manager-api:<sha>
#   CHECK_URL, EXPECTED_COMMIT, REQUIRE_TEXT, TIMEOUT_SECONDS  see wait-for-release.sh
set -euo pipefail

: "${RENDER_DEPLOY_HOOK:?RENDER_DEPLOY_HOOK is required}"
: "${IMAGE:?IMAGE is required}"

encoded_image="$(jq -rn --arg value "$IMAGE" '$value|@uri')"
separator='?'
case "$RENDER_DEPLOY_HOOK" in *\?*) separator='&' ;; esac

echo "Triggering Render deploy for ${IMAGE}"
http_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "${RENDER_DEPLOY_HOOK}${separator}imgURL=${encoded_image}")"
if [ "${http_code}" -lt 200 ] || [ "${http_code}" -ge 300 ]; then
  echo "::error::Render deploy hook answered HTTP ${http_code}"
  exit 1
fi

exec bash "$(dirname "$0")/wait-for-release.sh"
