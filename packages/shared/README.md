# Shared Contracts

TypeScript types, runtime schemas (Zod), and API DTOs shared by the API, frontend, and sensor
simulator. Everything a consumer needs to talk to the REST API is here.

## Layout

```text
src/
  primitives.ts   # EVM value formats: address, bytes32, signature
  domain.ts       # Role, BatchStatus, Step — the workflow-definition contract
  api.ts          # request/response schemas for every endpoint
  abis.ts         # AUTO-GENERATED contract ABIs (see below) — do not edit
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

## Blockchain ABI artifacts (`src/abis.ts`)

`src/abis.ts` is **auto-generated**: [`contracts/scripts/generate-abis.mjs`](../../contracts/scripts/generate-abis.mjs)
extracts the ABIs of `Workflow` and `WorkflowFactory` from the Hardhat build artifacts
(`contracts/artifacts/`, produced by the Solidity compiler) and writes them here as ethers
human-readable signature strings. The generator runs automatically as part of
`npm run build` in `contracts/` (or directly via `npm run gen:abis` there), and the
regenerated file is committed — consumers never need the Solidity toolchain to build.

This resolves the original FLAG #1 in `apps/api/src/blockchain.ts`: the ABIs there used to
be hand-authored mirrors of the Solidity sources with nothing keeping them in sync.
`blockchain.ts` now imports `WORKFLOW_ABI`/`WORKFLOW_FACTORY_ABI` from this package's entry
point.

Do not edit `src/abis.ts` by hand, and do not paste raw ABI JSON — change the Solidity
source in `contracts/contracts/*.sol`, rebuild the contracts, and commit the regenerated
module in the same commit.

## Versioning

Bump `version` on any wire-contract change; consumers' lockfiles pin the file: dependency.
Breaking changes to request/response shapes must be reflected in `docs/backend-api.md` and
the API's test suite in the same commit.
