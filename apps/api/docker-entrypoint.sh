#!/bin/sh
# Container entrypoint for the API image.
# RUN_MIGRATIONS=true applies pending migrations before starting (single-instance PaaS without a
# pre-deploy hook). Only "migrate deploy" is ever run here: never migrate dev, db push or reset.
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying pending Prisma migrations (migrate deploy)..."
  ./node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma
fi

exec "$@"
