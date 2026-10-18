import { z } from "zod";

import { bytes32Schema } from "./primitives.js";

/**
 * Domain vocabulary shared by the contracts, the API, the frontend, and the sensor simulator.
 */

/**
 * Canonical role ids, in the same order as `enum Role` in contracts/contracts/Workflow.sol.
 * `none` means "not registered" and is never accepted as a step/participant role.
 */
export const ROLES = [
  "none",
  "manufacturer",
  "distributor",
  "carrier",
  "distribution_center",
  "retailer",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);

/** Roles that may be assigned to a step or participant (`none` excluded). */
export const assignableRoleSchema = roleSchema.exclude(["none"]);

/** Human-readable labels, purely for UI/logging  */
export const ROLE_LABELS: Record<Role, string> = {
  none: "None",
  manufacturer: "Manufacturer",
  distributor: "Distributor",
  carrier: "Carrier",
  distribution_center: "Distribution Center",
  retailer: "Retailer",
  admin: "Admin",
};

/** Fixed mapping between the canonical role ids and the on-chain `uint8` enum values. */
export const ROLE_CHAIN_IDS: Record<Role, number> = {
  none: 0,
  manufacturer: 1,
  distributor: 2,
  carrier: 3,
  distribution_center: 4,
  retailer: 5,
  admin: 6,
};

/** Canonical role id → on-chain `uint8` value, for calls into the Workflow contract. */
export function roleToChainId(role: Role): number {
  return ROLE_CHAIN_IDS[role];
}

/** On-chain `uint8` value → canonical role id. Throws on values outside the enum. */
export function roleFromChainId(chainRoleId: number): Role {
  const entry = (Object.entries(ROLE_CHAIN_IDS) as Array<[Role, number]>).find(
    ([, id]) => id === chainRoleId,
  );
  if (!entry) {
    throw new Error(`Unknown on-chain role id: ${chainRoleId}`);
  }
  return entry[0];
}

/** Batch lifecycle state as exposed by the API. */
export const BATCH_STATUSES = ["ACTIVE", "COMPROMISED"] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const batchStatusSchema = z.enum(BATCH_STATUSES);

/** Fixed mapping to the on-chain `BatchStatus` enum in contracts/contracts/Workflow.sol. */
export const BATCH_STATUS_CHAIN_IDS: Record<BatchStatus, 0 | 1> = {
  ACTIVE: 0,
  COMPROMISED: 1,
};

/** API batch status → on-chain `uint8` value. */
export function batchStatusToChain(status: BatchStatus): 0 | 1 {
  return BATCH_STATUS_CHAIN_IDS[status];
}

/** On-chain `uint8` value → API batch status. Throws on values outside the enum. */
export function batchStatusFromChain(chainStatus: number): BatchStatus {
  if (chainStatus === 0) return "ACTIVE";
  if (chainStatus === 1) return "COMPROMISED";
  throw new Error(`Unknown on-chain batch status: ${chainStatus}`);
}

/**
 * One ordered workflow step — the unit of the enterprise-defined workflow (docs/context.md
 * §3.1, §7). `specificationHash` is the keccak256 hash of the full deliverable specification,
 * which is stored off-chain (docs/context.md §3.3); the hash itself is the only thing that
 * reaches the chain, so consumers must hash the real spec before submitting (e.g. with
 * `ethers.id` or `viem.keccak256`).
 */
export const stepSchema = z.object({
  name: z.string().trim().min(1).max(120),
  requiredRole: assignableRoleSchema,
  specificationHash: bytes32Schema,
});

export type WorkflowStep = z.infer<typeof stepSchema>;
