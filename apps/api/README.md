# API and Indexer

Node.js/TypeScript process responsible for REST endpoints, off-chain workflow-schema validation, blockchain transaction integration, event indexing, authentication, and PostgreSQL access.

The current foundation uses Express, Zod, an in-memory repository, and Vitest. PostgreSQL, blockchain integration, authentication, and event indexing will be added in later increments.

## Run locally

```bash
npm install
npm run dev
```

The API starts on port `3000` by default. Use `npm test` to run the HTTP tests and `npm run build` to compile TypeScript.

## Current endpoints

- `GET /api/health`
- `POST /api/workflows`
- `GET /api/workflows/:workflowId`
- `POST /api/workflows/:workflowId/participants`
- `POST /api/batches`
- `POST /api/batches/:batchId/transfers`
- `GET /api/batches/:batchId/history`

## Toolchain

- Node.js 24 LTS
- npm
- TypeScript
- Express
- ethers
- PostgreSQL (`pg`)
- Zod for runtime boundary validation

## Local Development

Create a local environment file from `.env.example`, then run:

```bash
npm install
npm run dev
```

Available checks:

```bash
npm run typecheck
npm run build
npm start
```

The boilerplate exposes `GET /health` for process and container health checks.

## Docker

Build from this directory so `.dockerignore` applies:

```bash
docker build -t provenance-api .
docker run --rm -p 3000:3000 --env-file .env provenance-api
```

The final image contains production dependencies and compiled JavaScript only, and runs as a non-root user.

## Layout

```text
src/
  config/
  index.ts
tests/
```

Feature directories will be introduced as their corresponding functionality is implemented.
