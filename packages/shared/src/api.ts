import { z } from "zod";

import { assignableRoleSchema, batchStatusSchema, stepSchema } from "./domain.js";
import { bytes32Schema, evmAddressSchema, signatureSchema } from "./primitives.js";

/**
 * Wire contract of the REST API.
 *
 * The schemas are the single source of truth for three audiences:
 * - the API validates requests (and could assert its responses) with them;
 * - the frontend validates forms and parses responses with them;
 * - the sensor simulator validates condition submissions with them.
 */

// -------------------------------------------------------------------------------------------
// Shared response fragments
// -------------------------------------------------------------------------------------------

/** Participant registration */
export const participantSchema = z.object({
  address: evmAddressSchema,
  role: assignableRoleSchema,
});

export type Participant = z.infer<typeof participantSchema>;

// -------------------------------------------------------------------------------------------
// Workflows
// -------------------------------------------------------------------------------------------

/** `POST /api/workflows` */
export const createWorkflowRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  adminAddress: evmAddressSchema,
  steps: z.array(stepSchema).min(1),
});

export type CreateWorkflowRequest = z.infer<typeof createWorkflowRequestSchema>;

/** Response of `POST /api/workflows` and `GET /api/workflows/:workflowId`. */
export const workflowResponseSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  adminAddress: evmAddressSchema,
  steps: z.array(stepSchema),
  participants: z.array(participantSchema),
  createdAt: z.iso.datetime(),
});

export type Workflow = z.infer<typeof workflowResponseSchema>;

// -------------------------------------------------------------------------------------------
// Custody transfers
// -------------------------------------------------------------------------------------------

/** One custody transfer as returned by the batch endpoints. */
export const transferResponseSchema = z.object({
  id: z.uuid(),
  from: evmAddressSchema,
  to: evmAddressSchema,
  stepIndex: z.number().int().min(0),
  locationReference: z.string().min(1).optional(),
  conditionReferences: z.array(z.string().min(1)),
  deliverableHash: bytes32Schema,
  signature: signatureSchema,
  createdAt: z.iso.datetime(),
});

export type Transfer = z.infer<typeof transferResponseSchema>;

/** `POST /api/batches/:batchId/transfers` */
export const transferRequestSchema = z.object({
  from: evmAddressSchema,
  to: evmAddressSchema,
  stepIndex: z.number().int().min(0),
  /** Optional off-chain reference (e.g. location/document id) that never reaches the chain. */
  locationReference: z.string().trim().min(1).max(200).optional(),
  /** Off-chain references to condition/document data whose hashes may be anchored on-chain. */
  conditionReferences: z.array(z.string().trim().min(1).max(200)).default([]),
  deliverableHash: bytes32Schema,
  signature: signatureSchema,
});

export type TransferRequest = z.infer<typeof transferRequestSchema>;

// -------------------------------------------------------------------------------------------
// Batches
// -------------------------------------------------------------------------------------------

/** `POST /api/batches` */
export const createBatchRequestSchema = z.object({
  workflowId: z.uuid(),
  currentCustodian: evmAddressSchema,
});

export type CreateBatchRequest = z.infer<typeof createBatchRequestSchema>;

/** Response of `POST /api/batches`. */
export const batchResponseSchema = z.object({
  id: z.uuid(),
  workflowId: z.uuid(),
  currentCustodian: evmAddressSchema,
  currentStepIndex: z.number().int().min(0),
  status: batchStatusSchema,
  transfers: z.array(transferResponseSchema),
  createdAt: z.iso.datetime(),
});

export type Batch = z.infer<typeof batchResponseSchema>;

/** Response of `GET /api/batches/:batchId/history`. */
export const batchHistoryResponseSchema = z.object({
  batchId: z.uuid(),
  status: batchStatusSchema,
  transfers: z.array(transferResponseSchema),
});

export type BatchHistory = z.infer<typeof batchHistoryResponseSchema>;

// -------------------------------------------------------------------------------------------
// Misc
// -------------------------------------------------------------------------------------------

/** `GET /api/health` (service name included) and `GET /health` (status only). */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1).optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** Every error response: `{"error": "..."}` with optional zod issue `details` on 400s. */
export const errorResponseSchema = z.object({
  error: z.string().min(1),
  details: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Chain connectivity snapshot returned by `getChainStatus()` in apps/api/src/blockchain.ts.
 * Reserved for a future `GET /api/chain/status` endpoint — do not ship a different shape.
 */
export const chainStatusSchema = z.object({
  chainId: z.number().int().min(1),
  blockNumber: z.number().int().min(0),
});

export type ChainStatus = z.infer<typeof chainStatusSchema>;
