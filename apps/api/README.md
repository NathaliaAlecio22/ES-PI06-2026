# API and Indexer

Node.js/TypeScript process responsible for REST endpoints, off-chain workflow-schema validation, blockchain transaction integration, event indexing, authentication, and PostgreSQL access.

The current foundation uses Express, Zod, an in-memory repository, and Vitest. PostgreSQL, blockchain integration, authentication, and event indexing will be added in later increments.

## Run locally

```bash
npm install
npm run dev
```

The API starts on port `3000` by default. Use `npm test` to run the HTTP tests and `npm run build` to compile TypeScript.

## Test run log

`npm test` também registra, em `logs/api-run.log`, cada requisição HTTP feita pela suíte:
o corpo enviado e a resposta real da API (status + corpo), agrupados por teste, com um
resumo ao final (`37 requisições · 200×2 · 201×19 · …`). O arquivo é recriado a cada
execução, cada entrada é gravada assim que a resposta chega (sobrevive a execuções que
quebrem no meio) e já está coberto pelo `.gitignore` da raiz. A instrumentação vive em
`tests/helpers/api-log.ts` — um wrapper do supertest com a mesma assinatura.

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
- `@provenance/shared` (DTOs e schemas Zod compartilhados — [`packages/shared`](../../packages/shared/README.md))
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

O contexto de build é a raiz do repositório (a imagem inclui `packages/shared`, de onde vêm os
DTOs):

```bash
docker build -f apps/api/Dockerfile -t provenance-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env provenance-api
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
