# syntax=docker/dockerfile:1

# Build from the repository root so the local @provenance/shared package is included:
#
#   docker build -f apps/api/Dockerfile -t provenance-api .
#
# The dependency graph spans two packages (apps/api + packages/shared), so the build context
# is the repo root and every COPY below is deliberately explicit — nothing outside these
# paths ever enters the image, so no .dockerignore filtering is required.

ARG NODE_VERSION=24.11.1-alpine

FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
# packages/shared source is needed before `npm ci` because the API's postinstall script
# builds it (see apps/api/package.json).
COPY packages/shared/package.json packages/shared/package-lock.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src/ ./packages/shared/src/
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
WORKDIR /app/apps/api
# Installs both dependency trees (packages/shared is a file: dependency) and builds
# packages/shared via the postinstall script.
RUN npm ci

FROM dependencies AS build
WORKDIR /app/apps/api
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/src/ ./src/
RUN npm run build

FROM dependencies AS prod-deps
WORKDIR /app/apps/api
# --ignore-scripts skips the postinstall build of packages/shared: its dist was already
# produced in the `dependencies` stage and lives outside node_modules, and rebuilding it
# here would need its dev dependency (typescript), which --omit=dev does not install.
RUN npm ci --omit=dev --ignore-scripts

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api

RUN addgroup -S api && adduser -S api -G api

COPY --from=prod-deps --chown=api:api /app/packages/shared /app/packages/shared
COPY --from=prod-deps --chown=api:api /app/apps/api/package.json /app/apps/api/package-lock.json ./
COPY --from=prod-deps --chown=api:api /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=api:api /app/apps/api/dist ./dist

USER api
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "--enable-source-maps", "dist/src/index.js"]
