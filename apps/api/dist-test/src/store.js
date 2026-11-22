"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batches = exports.workflows = void 0;
exports.createId = createId;
exports.resetStore = resetStore;
// The database now persists workflow definitions and ordered custody stages.
// This cache remains only for the standalone /api/batches demonstration endpoints;
// production lot transfers derive their state from PostgreSQL + the blockchain.
const node_crypto_1 = require("node:crypto");
const ethers_1 = require("ethers");
/** Optional process cache; PostgreSQL is the durable source used by the application routes. */
exports.workflows = new Map();
/** Ephemeral state for standalone demonstration batch endpoints (not production lot transfers). */
exports.batches = new Map();
/**
 * Mints ids already in the on-chain `uint256 batchId` shape (keccak256 of a UUID — the same
 * formula as `deriveBatchId` in src/blockchain.ts), so a store id can be submitted to the
 * contract verbatim. Over REST they travel as decimal strings (see app.ts).
 */
function createId() {
    return BigInt(ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes((0, node_crypto_1.randomUUID)())));
}
function resetStore() {
    exports.workflows.clear();
    exports.batches.clear();
}
