-- Fix: lote.chain_batch_id was BIGINT (Postgres 64-bit), but the on-chain batchId is a
-- uint256 (keccak256 of a UUID — up to 78 decimal digits), which overflows BIGINT.
-- Caught by a live end-to-end smoke test. Store the decimal string instead; no existing
-- rows have a non-null value yet, so no data conversion is needed.
ALTER TABLE "lote" ALTER COLUMN "chain_batch_id" TYPE VARCHAR(80) USING "chain_batch_id"::VARCHAR(80);
