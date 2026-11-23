import { z } from "zod";

import { assignableRoleSchema } from "./domain.js";
import { evmAddressSchema } from "./primitives.js";

/**
 * Wire contract of `/api/cadeia` — the organization's single custody chain (PoC limitation:
 * one chain per organization, docs/TOFIX.md). Each step is administered by one participant
 * organization, identified by its on-chain address; the chain itself only stores the step's
 * required role (docs/architecture.md: identity is not part of the workflow shape).
 */

/** The five on-chain roles are one-to-one with participants, so a chain has at most 5 steps. */
export const MAX_CHAIN_STEPS = 5;

export const chainStepRoleSchema = assignableRoleSchema.exclude(["admin"]);

/** `POST /api/cadeia` */
export const createCustodyChainRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  steps: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        requiredRole: chainStepRoleSchema,
        assignee: evmAddressSchema,
        specification: z.string().trim().min(1).max(2000),
      }),
    )
    .min(2, "Defina ao menos duas etapas.")
    .max(MAX_CHAIN_STEPS, `A cadeia aceita no máximo ${MAX_CHAIN_STEPS} etapas.`),
});

export type CreateCustodyChainRequest = z.infer<typeof createCustodyChainRequestSchema>;
