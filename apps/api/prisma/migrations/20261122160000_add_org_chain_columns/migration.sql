-- Per-organization on-chain identity and workflow (consolidation, Phase 2):
-- each organization owns one Workflow contract and one Hardhat account.

ALTER TABLE "participante" ADD COLUMN "workflow_address" VARCHAR(42);
ALTER TABLE "participante" ADD COLUMN "workflow_steps" JSONB;

-- Chain-backed lots: the on-chain batch id (uint256, mirrored) and the current step.
ALTER TABLE "lote" ADD COLUMN "chain_batch_id" BIGINT UNIQUE;
ALTER TABLE "lote" ADD COLUMN "current_step_index" INTEGER NOT NULL DEFAULT 0;
