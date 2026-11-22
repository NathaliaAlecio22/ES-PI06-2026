"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const environmentSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().min(1).max(65_535).default(3_000),
    DATABASE_URL: zod_1.z.string().min(1),
    RPC_URL: zod_1.z.url(),
    CHAIN_ID: zod_1.z.coerce.number().int().positive(),
    WORKFLOW_FACTORY_ADDRESS: zod_1.z.string().optional(),
    TRANSACTION_SIGNER_PRIVATE_KEY: zod_1.z.string().optional(),
    SESSION_SECRET: zod_1.z.string().optional(),
});
exports.env = environmentSchema.parse(process.env);
