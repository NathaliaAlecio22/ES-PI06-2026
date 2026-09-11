# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.11.1-alpine

FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S api && adduser -S api -G api

COPY --from=build --chown=api:api /app/package.json /app/package-lock.json ./
COPY --from=build --chown=api:api /app/node_modules ./node_modules
COPY --from=build --chown=api:api /app/dist ./dist

USER api
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "--enable-source-maps", "dist/index.js"]
