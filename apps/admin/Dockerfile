# syntax=docker/dockerfile:1.7
# Build context: repository root.
#   docker build -f apps/admin/Dockerfile -t resource-manager-admin:<sha> .
# NEXT_PUBLIC_API_URL is left empty by default: the admin calls /api/* on its own origin and the
# reverse proxy forwards it to the API, so the same image is promoted to every environment.

ARG NODE_IMAGE=node:22-bookworm-slim
ARG PNPM_VERSION=10.27.0

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/api-client/package.json packages/api-client/
COPY packages/types/package.json packages/types/
COPY packages/schemas/package.json packages/schemas/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter admin...

COPY packages/api-client ./packages/api-client
COPY packages/types ./packages/types
COPY packages/schemas ./packages/schemas
COPY apps/admin ./apps/admin

ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter admin build

# ---- Runtime ----
FROM ${NODE_IMAGE} AS runtime

ARG APP_VERSION=dev
ARG GIT_COMMIT_SHA=local
ARG BUILD_DATE=
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=${APP_VERSION} \
    GIT_COMMIT_SHA=${GIT_COMMIT_SHA} \
    BUILD_DATE=${BUILD_DATE}

LABEL org.opencontainers.image.title="resource-manager-admin" \
      org.opencontainers.image.source="https://github.com/Appatam-SARL/resource-manager" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}"

WORKDIR /app
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /repo/apps/admin/public ./apps/admin/public
# Next.js needs a writable cache directory at runtime; everything else stays read-only.
RUN mkdir -p apps/admin/.next/cache && chown node:node apps/admin/.next/cache

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "apps/admin/server.js"]
