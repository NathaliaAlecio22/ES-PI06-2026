// The database now persists workflow definitions and ordered custody stages.
// This cache remains only for the standalone /api/batches demonstration endpoints;
// production lot transfers derive their state from PostgreSQL + the blockchain.
import { randomUUID } from "node:crypto";
import { ethers } from "ethers";

import type { Batch, Workflow } from "@provenance/shared";

/**
 * Workflow as stored by the API: the shared response shape plus the address of the
 * on-chain `Workflow` instance deployed via `createWorkflow` in src/blockchain.ts.
 */
export type StoredWorkflow = Workflow & {
  workflowAddress: string;
};

/** Optional process cache; PostgreSQL is the durable source used by the application routes. */
export const workflows = new Map<bigint, StoredWorkflow>();
/** Ephemeral state for standalone demonstration batch endpoints (not production lot transfers). */
export const batches = new Map<bigint, Batch>();

/**
 * Mints ids already in the on-chain `uint256 batchId` shape (keccak256 of a UUID — the same
 * formula as `deriveBatchId` in src/blockchain.ts), so a store id can be submitted to the
 * contract verbatim. Over REST they travel as decimal strings (see app.ts).
 */
export function createId(): bigint {
  return BigInt(ethers.keccak256(ethers.toUtf8Bytes(randomUUID())));
}

export function resetStore(): void {
  workflows.clear();
  batches.clear();
}
