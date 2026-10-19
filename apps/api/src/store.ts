// NOTE: This is an in-memory store (data is lost on restart).
// TODO: Persist workflows and batches to the project database once
// backend persistence is implemented.
import { randomUUID } from "node:crypto";
import { ethers } from "ethers";

import type { Batch, Workflow } from "@provenance/shared";

export const workflows = new Map<bigint, Workflow>();
export const batches = new Map<bigint, Batch>();

export function createId(): bigint {
  return BigInt(ethers.keccak256(ethers.toUtf8Bytes(randomUUID())))
}

export function resetStore(): void {
  workflows.clear();
  batches.clear();
}
