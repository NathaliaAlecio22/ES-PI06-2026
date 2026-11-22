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
  SESSION_SECRET: z.string().optional(),

  // Application authentication (FR-14). JWT signs/verifies every authenticated route;
  // RESET_CODE_SECRET HMACs the e-mailed password-recovery codes.
  JWT_SECRET: z.string().min(16),
  RESET_CODE_SECRET: z.string().min(16),

  // Comma-separated list of browser origins allowed to call the API.
  CORS_ORIGIN: z.string().optional(),

  // E-mail (invites, password recovery) — optional: features fail per-request with a
  // clear error when unset (see src/service/email.service.ts).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FRONTEND_URL: z.url().default("http://localhost:5173"),

  // Condition thresholds (FR-10/FR-11): readings above these values compromise the
  // batch on-chain. Temperature in ºC, humidity in % — both stored ×100 on-chain.
  TEMPERATURE_THRESHOLD_C: z.coerce.number().default(8),
  HUMIDITY_THRESHOLD_PCT: z.coerce.number().default(100),
});

export const env = environmentSchema.parse(process.env);
