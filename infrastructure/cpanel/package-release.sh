#!/usr/bin/env bash
# Builds the cPanel release archives FROM the images already validated in STAGING and PREPROD:
# no rebuild, the compiled code is exactly the one that was tested.
#
#   API_IMAGE=ghcr.io/…/resource-manager-api:<sha> ADMIN_IMAGE=ghcr.io/…/resource-manager-admin:<sha> \
#     bash infrastructure/cpanel/package-release.sh <sha> <output-dir>
#
# Run from the repository checked out at <sha> (the API archive ships that commit's lockfile;
# production dependencies are installed on the server from it, with --frozen-lockfile, so native
# modules match the server platform).
set -euo pipefail

SHA="${1:?usage: package-release.sh <sha> <output-dir>}"
OUT="${2:?usage: package-release.sh <sha> <output-dir>}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${ADMIN_IMAGE:?ADMIN_IMAGE is required}"

work="$(mktemp -d)"
containers=()
cleanup() {
  for id in "${containers[@]}"; do docker rm -f "$id" > /dev/null 2>&1 || true; done
  rm -rf "$work"
}
trap cleanup EXIT

check_revision() {
  local image="$1" revision
  revision="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")"
  if [ "$revision" != "$SHA" ]; then
    echo "::error::$image was built from ${revision:-unknown}, expected $SHA" >&2
    exit 1
  fi
}

check_revision "$API_IMAGE"
check_revision "$ADMIN_IMAGE"

# ---- API: compiled code + Prisma schema/migrations + lockfile of the same commit ----
api_container="$(docker create "$API_IMAGE")"
containers+=("$api_container")
mkdir -p "$work/api/apps/api"
docker cp "$api_container:/app/apps/api/dist" "$work/api/apps/api/dist"
docker cp "$api_container:/app/apps/api/package.json" "$work/api/apps/api/package.json"
docker cp "$api_container:/app/prisma" "$work/api/prisma"
cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$work/api/"

# ---- Admin: the Next.js standalone server, self-contained ----
admin_container="$(docker create "$ADMIN_IMAGE")"
containers+=("$admin_container")
docker cp "$admin_container:/app" "$work/admin"
rm -rf "$work/admin/apps/admin/.next/cache"

# ---- Release identity, read by the Passenger entry files (served by /api/v1/health) ----
label() {
  docker image inspect --format "{{ index .Config.Labels \"org.opencontainers.image.$2\" }}" "$1"
}
for app in api admin; do
  image_var="${app^^}_IMAGE"
  printf '{"commit":"%s","version":"%s","buildDate":"%s"}\n' \
    "$SHA" "$(label "${!image_var}" version)" "$(label "${!image_var}" created)" \
    > "$work/$app/release.json"
done

mkdir -p "$OUT"
tar -czf "$OUT/api-$SHA.tar.gz" -C "$work/api" .
tar -czf "$OUT/admin-$SHA.tar.gz" -C "$work/admin" .
(cd "$OUT" && sha256sum "api-$SHA.tar.gz" "admin-$SHA.tar.gz" > SHA256SUMS)

echo "Release archives for ${SHA:0:7}:"
(cd "$OUT" && ls -lh -- *.tar.gz && cat SHA256SUMS)
