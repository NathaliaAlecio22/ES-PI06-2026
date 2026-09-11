import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
  DATABASE_URL: z.string().min(1),
  RPC_URL: z.url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  WORKFLOW_FACTORY_ADDRESS: z.string().optional(),
  TRANSACTION_SIGNER_PRIVATE_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional()
});

export const env = environmentSchema.parse(process.env);
