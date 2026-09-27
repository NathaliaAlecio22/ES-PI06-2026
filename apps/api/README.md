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

Suggested future layout:

```text
src/
  api/
  blockchain/
  config/
  database/
  indexer/
  modules/
tests/
```
