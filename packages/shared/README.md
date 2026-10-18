# Shared Contracts

TypeScript types, runtime schemas (Zod), and API DTOs shared by the API, frontend, and sensor
simulator. Everything a consumer needs to talk to the REST API is here.

## Layout

```text
src/
  primitives.ts   # EVM value formats: address, bytes32, signature
  domain.ts       # Role, BatchStatus, Step — the workflow-definition contract
  api.ts          # request/response schemas for every endpoint
  index.ts        # public entry point
```
The role ids (`ROLES`) and their on-chain numeric values (`ROLE_CHAIN_IDS`) mirror
`enum Role` in [`contracts/contracts/Workflow.sol`](../../contracts/contracts/Workflow.sol);
`roleFromChainId`/`roleToChainId` (and the batch-status pair) convert at the boundary.

## Consumption

Consumers link the package locally and rebuild it on install:

```jsonc
// consumer package.json
{
  "dependencies": {
    "@provenance/shared": "file:../../packages/shared"
  },
  "scripts": {
    "postinstall": "npm run build --prefix ../../packages/shared"
  }
}
```

```ts
import { createWorkflowRequestSchema, type Workflow } from "@provenance/shared";
```

npm creates a junction/symlink under the consumer's `node_modules`, so after editing this
package run `npm run build` here and restart the consumer's dev server. `apps/api` already follows this exact pattern.

## Blockchain ABI artifacts — deliberately not here (yet)

Per the original scoping note and FLAG #1 in [`apps/api/src/blockchain.ts`](../../apps/api/src/blockchain.ts),
generated ABI artifacts should have **one documented generation and consumption path**. The
plan, once the contract team settles the Solidity sources: a small generator script (run
after `hardhat build` in `contracts/`) that extracts the compiler artifacts' ABIs into a
generated module here, and `blockchain.ts` imports them instead of its current hand-authored
copies. Do not paste raw ABI JSON by hand into this package in the meantime.

## Versioning

Bump `version` on any wire-contract change; consumers' lockfiles pin the file: dependency.
Breaking changes to request/response shapes must be reflected in `docs/backend-api.md` and
the API's test suite in the same commit.
