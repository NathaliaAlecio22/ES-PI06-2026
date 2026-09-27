import { z } from "zod";

export const workflowSchema = z.object({
  name: z.string().trim().min(1),
  adminAddress: z.string().trim().min(1),
  steps: z.array(z.object({
    name: z.string().trim().min(1),
    requiredRole: z.string().trim().min(1),
    specificationHash: z.string().trim().min(1),
  })).min(1),
});

export const participantSchema = z.object({
  address: z.string().trim().min(1),
  role: z.string().trim().min(1),
});

export const batchSchema = z.object({
  workflowId: z.string().trim().min(1),
  currentCustodian: z.string().trim().min(1),
});

export const transferSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  stepIndex: z.number().int().nonnegative(),
  locationReference: z.string().trim().min(1).optional(),
  conditionReferences: z.array(z.string().trim().min(1)).default([]),
  deliverableHash: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});