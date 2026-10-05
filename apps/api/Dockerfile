# syntax=docker/dockerfile:1.7
# Build context: repository root.
#   docker build -f apps/api/Dockerfile -t resource-manager-api:<sha> .
# The same image runs the API and the one-shot migration job (prisma migrate deploy).

ARG NODE_IMAGE=node:22-bookworm-slim
ARG PNPM_VERSION=10.27.0

FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/

# ---- Full dependencies (build tooling) ----
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api
COPY prisma ./prisma
COPY apps/api ./apps/api
RUN pnpm --filter api exec prisma generate --schema=../../prisma/schema.prisma \
 && pnpm --filter api build

# ---- Production dependencies only ----
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter api
COPY prisma ./prisma
RUN pnpm --filter api exec prisma generate --schema=../../prisma/schema.prisma

# ---- Runtime ----
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ARG APP_VERSION=dev
ARG GIT_COMMIT_SHA=local
ARG BUILD_DATE=
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1 \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    GIT_COMMIT_SHA=${GIT_COMMIT_SHA} \
    BUILD_DATE=${BUILD_DATE}

LABEL org.opencontainers.image.title="resource-manager-api" \
      org.opencontainers.image.source="https://github.com/Appatam-SARL/resource-manager" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}"

WORKDIR /app
# Application files stay root-owned: the runtime user can read but not modify them.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY prisma ./prisma
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod 0755 /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/apps/api
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
