"use strict";
/**
 * Blockchain communication layer.
 *
 * Talks to the `WorkflowFactory` + per-enterprise `Workflow` contracts described in
 * docs/context.md §3, §5 and §7 over plain JSON-RPC (Hardhat locally, Sepolia/successor
 * testnet for demos — see docs/context.md §4). This module intentionally contains the
 * *only* ethers.js usage in the API: callers (routes, the event indexer) depend on the
 * typed functions below instead of touching `ethers` directly.
 *
 * ---------------------------------------------------------------------------
 * FLAGS for the contracts team (docs/context.md asked to surface doc/code conflicts):
 *
 * 1. The fixed `Role` enum in §7 (Manufacturer/Distributor/Carrier/...) hardcodes specific
 *    real-world job titles, which sits in tension with §3.1's "enterprise defines its own
 *    workflow" goal — a truly generic engine might use small opaque role ids with
 *    off-chain labels instead. Implemented as specified in §7 for now; flagging the
 *    tension rather than silently resolving it. The canonical wire representation lives in
 *    packages/shared (src/domain.ts) — this module imports it and converts to/from the
 *    on-chain uint8 values with `roleToChainId`/`roleFromChainId` at the boundary.
 * ---------------------------------------------------------------------------
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowFactoryVersionError = void 0;
exports.assertAddress = assertAddress;
exports.assertBytes32 = assertBytes32;
exports.hashSpecification = hashSpecification;
exports.getProvider = getProvider;
exports.getSigner = getSigner;
exports.resetConnections = resetConnections;
exports.getFactoryContract = getFactoryContract;
exports.getWorkflowContract = getWorkflowContract;
exports.isWorkflowFactoryVersionError = isWorkflowFactoryVersionError;
exports.revertReasonOf = revertReasonOf;
exports.createWorkflow = createWorkflow;
exports.getWorkflowForOrganization = getWorkflowForOrganization;
exports.deriveLotBatchId = deriveLotBatchId;
exports.registerParticipant = registerParticipant;
exports.revokeParticipant = revokeParticipant;
exports.createBatch = createBatch;
exports.transferCustody = transferCustody;
exports.reportCondition = reportCondition;
exports.getChainStatus = getChainStatus;
exports.getWorkflowAdmin = getWorkflowAdmin;
exports.getWorkflowOrganizationId = getWorkflowOrganizationId;
exports.getWorkflowName = getWorkflowName;
exports.getWorkflowCreatedAt = getWorkflowCreatedAt;
exports.getWorkflowSteps = getWorkflowSteps;
exports.getParticipantRole = getParticipantRole;
exports.getBatchState = getBatchState;
exports.getCustodyHistory = getCustodyHistory;
exports.getConditionBreaches = getConditionBreaches;
exports.buildDataHash = buildDataHash;
exports.buildTransferDigest = buildTransferDigest;
exports.recoverTransferSigner = recoverTransferSigner;
exports.subscribeToWorkflowEvents = subscribeToWorkflowEvents;
exports.subscribeToFactoryEvents = subscribeToFactoryEvents;
const ethers_1 = require("ethers");
const shared_1 = require("@provenance/shared");
const env_js_1 = require("./config/env.js");
// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function assertAddress(value, field = "address") {
    if (!ethers_1.ethers.isAddress(value)) {
        throw new Error(`Invalid ${field}: "${value}" is not a valid Ethereum address`);
    }
    return ethers_1.ethers.getAddress(value);
}
function assertBytes32(value, field = "hash") {
    if (!ethers_1.ethers.isHexString(value, 32)) {
        throw new Error(`Invalid ${field}: "${value}" must be a 0x-prefixed 32-byte hex string`);
    }
    return value;
}
function hashSpecification(specification) {
    if (!specification.trim())
        throw new Error("Specification cannot be empty");
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(specification.trim()));
}
// ---------------------------------------------------------------------------
// Provider / signer — lazily constructed singletons.
// ---------------------------------------------------------------------------
let cachedProvider;
let cachedSigner;
/** Shared read-only JSON-RPC provider, pinned to the configured chain id. */
function getProvider() {
    if (!cachedProvider) {
        const url = env_js_1.env.RPC_URL;
        if (!url) {
            throw new Error("No RPC endpoint configured: set RPC_URL in the environment");
        }
        // Passing the chain id makes this a "static" network: ethers trusts it instead of
        // issuing an extra eth_chainId round trip per request, and throws if the RPC
        // endpoint ever reports a different chain id than the one we were configured with.
        //
        // `cacheTimeout: -1` disables ethers' default 250ms de-duplication window for identical
        // in-flight requests (e.g. two `eth_getTransactionCount` calls for the same signer).
        // Against a real network that's a reasonable optimization, but Hardhat's local node mines
        // instantly, so two writes from the same signer issued within that window (e.g. two
        // consecutive registerParticipant calls) would otherwise reuse a stale cached nonce and
        // the second transaction would be rejected with "nonce has already been used".
        cachedProvider = new ethers_1.ethers.JsonRpcProvider(url, env_js_1.env.CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });
    }
    return cachedProvider;
}
/**
 * Signer used for state-changing calls (registering participants, submitting transfers,
 * reporting conditions). Only required for write paths.
 */
function getSigner() {
    if (!cachedSigner) {
        const privateKey = env_js_1.env.TRANSACTION_SIGNER_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("TRANSACTION_SIGNER_PRIVATE_KEY is not set; this operation requires a funded signer");
        }
        cachedSigner = new ethers_1.ethers.Wallet(privateKey, getProvider());
    }
    return cachedSigner;
}
/** Test/shutdown helper: drop cached provider+signer so the next call reconstructs them. */
function resetConnections() {
    cachedProvider?.destroy();
    cachedProvider = undefined;
    cachedSigner = undefined;
}
// ---------------------------------------------------------------------------
// Contract handles
// ---------------------------------------------------------------------------
function getFactoryContract(withSigner = false) {
    const address = env_js_1.env.WORKFLOW_FACTORY_ADDRESS;
    if (!address) {
        throw new Error("WORKFLOW_FACTORY_ADDRESS is not configured");
    }
    const runner = withSigner ? getSigner() : getProvider();
    return new ethers_1.ethers.Contract(assertAddress(address, "WORKFLOW_FACTORY_ADDRESS"), shared_1.WORKFLOW_FACTORY_ABI, runner);
}
function getWorkflowContract(workflowAddress, withSigner = false) {
    const runner = withSigner ? getSigner() : getProvider();
    return new ethers_1.ethers.Contract(assertAddress(workflowAddress, "workflowAddress"), shared_1.WORKFLOW_ABI, runner);
}
class WorkflowFactoryVersionError extends Error {
    constructor() {
        super("WORKFLOW_FACTORY_ADDRESS points to a factory deployed before organization workflows were added. Redeploy WorkflowFactory and update the configured address.");
        this.name = "WorkflowFactoryVersionError";
    }
}
exports.WorkflowFactoryVersionError = WorkflowFactoryVersionError;
function isWorkflowFactoryVersionError(error) {
    return error instanceof WorkflowFactoryVersionError;
}
function toChainError(action, error) {
    const details = error.reason ??
        error.shortMessage ??
        (error instanceof Error ? error.message : String(error));
    const wrapped = new Error(`${action} failed: ${details}`);
    // Tag rejections (the contract reverted) so callers can tell "the chain refused this
    // submission" apart from "we could not reach the chain".
    if (error.code === "CALL_EXCEPTION") {
        wrapped.revertReason = details;
    }
    return wrapped;
}
/** Decoded revert reason when the chain rejected a submission; `undefined` for transport/configuration failures. */
function revertReasonOf(error) {
    return error.revertReason;
}
async function sendAndWait(action, call) {
    let tx;
    try {
        tx = await call();
    }
    catch (error) {
        throw toChainError(action, error);
    }
    let receipt;
    try {
        receipt = await tx.wait();
    }
    catch (error) {
        throw toChainError(action, error);
    }
    if (!receipt) {
        throw new Error(`${action} failed: transaction was not mined`);
    }
    // Some ethers versions resolve `wait()` with a reverted receipt instead of throwing;
    // a revert must never be mistaken for success.
    if (receipt.status === 0) {
        throw toChainError(action, { code: "CALL_EXCEPTION", reason: "transaction reverted on-chain" });
    }
    return receipt;
}
function findEventLog(receipt, contract, eventName) {
    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contract.target.toLowerCase())
            continue;
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === eventName) {
            return log;
        }
    }
    return undefined;
}
// ---------------------------------------------------------------------------
// Writes — factory
// ---------------------------------------------------------------------------
/**
 * Deploys a new `Workflow` instance via the factory. `msg.sender` (the configured signer)
 * becomes that instance's admin automatically.
 */
async function createWorkflow(organizationId, name, steps) {
    if (organizationId <= 0n) {
        throw new Error("organizationId must be positive");
    }
    if (!name.trim()) {
        throw new Error("Workflow name is required");
    }
    if (steps.length === 0) {
        throw new Error("A workflow must define at least one step");
    }
    for (const step of steps) {
        assertBytes32(step.specificationHash, "step.specificationHash");
        assertAddress(step.assignee, "step.assignee");
    }
    const factory = getFactoryContract(true);
    const receipt = await sendAndWait("createWorkflow", () => factory.createWorkflow(organizationId, name.trim(), steps.map((step) => ({
        name: step.name,
        requiredRole: (0, shared_1.roleToChainId)(step.requiredRole),
        assignee: step.assignee,
        deliverableHash: step.specificationHash,
    }))));
    const log = findEventLog(receipt, factory, "WorkflowCreated");
    if (!log) {
        throw new Error("createWorkflow succeeded but no WorkflowCreated event was found in the receipt");
    }
    const parsed = factory.interface.parseLog(log);
    return {
        workflowAddress: parsed.args.workflow,
        admin: parsed.args.admin,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
    };
}
async function getWorkflowForOrganization(organizationId) {
    if (organizationId <= 0n)
        throw new Error("organizationId must be positive");
    const factory = getFactoryContract();
    let address;
    try {
        address = (await factory.workflowForOrganization(organizationId));
    }
    catch (error) {
        const code = error.code;
        const message = error instanceof Error ? error.message : String(error);
        if (code === "BAD_DATA" && /could not decode result data/i.test(message)) {
            throw new WorkflowFactoryVersionError();
        }
        throw error;
    }
    return address === ethers_1.ethers.ZeroAddress ? null : address;
}
async function deriveLotBatchId(lotCode) {
    return BigInt(ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`traceblock-lot:${lotCode}`)));
}
// ---------------------------------------------------------------------------
// Writes — workflow instance
// ---------------------------------------------------------------------------
/** FR-01: register an authorized identity for a role in this workflow. Admin-only on-chain. */
async function registerParticipant(workflowAddress, participant, role) {
    assertAddress(participant, "participant");
    if (role === "none") {
        throw new Error("Cannot register a participant with the role 'none'");
    }
    const contract = getWorkflowContract(workflowAddress, true);
    const receipt = await sendAndWait("registerParticipant", () => contract.registerParticipant(participant, (0, shared_1.roleToChainId)(role)));
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
/** Companion to registerParticipant: swap/replace a participant without redeploying (§3.4). */
async function revokeParticipant(workflowAddress, participant) {
    assertAddress(participant, "participant");
    const contract = getWorkflowContract(workflowAddress, true);
    const receipt = await sendAndWait("revokeParticipant", () => contract.revokeParticipant(participant));
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
/** Seeds on-chain state for a new batch at step 0 with its first custodian. */
async function createBatch(workflowAddress, batchId, initialCustodian) {
    assertAddress(initialCustodian, "initialCustodian");
    const contract = getWorkflowContract(workflowAddress, true);
    const receipt = await sendAndWait("createBatch", () => contract.createBatch(batchId, initialCustodian));
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
/**
 * FR-02..FR-07: records a custody transfer.
 */
async function transferCustody(workflowAddress, params) {
    assertAddress(params.to, "to");
    assertBytes32(params.deliverableHash, "deliverableHash");
    assertBytes32(params.dataHash, "dataHash");
    const contract = getWorkflowContract(workflowAddress, true);
    const receipt = await sendAndWait("transferCustody", () => contract.transferCustody(params.batchId, params.to, params.deliverableHash, params.dataHash, params.signature));
    const log = findEventLog(receipt, contract, "CustodyTransferred");
    if (!log) {
        throw new Error("transferCustody succeeded but no CustodyTransferred event was found in the receipt");
    }
    const parsed = contract.interface.parseLog(log);
    const event = {
        workflowAddress,
        batchId: parsed.args.batchId,
        from: parsed.args.from,
        to: parsed.args.to,
        stepIndex: Number(parsed.args.stepIndex),
        deliverableHash: parsed.args.deliverableHash,
        dataHash: parsed.args.dataHash,
        timestamp: Number(parsed.args.timestamp),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        logIndex: log.index,
    };
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber, event };
}
/** FR-08/FR-09: submit a sensor reading. */
async function reportCondition(workflowAddress, params) {
    assertBytes32(params.conditionKey, "conditionKey");
    const contract = getWorkflowContract(workflowAddress, true);
    const receipt = await sendAndWait("reportCondition", () => contract.reportCondition(params.batchId, params.conditionKey, params.value, params.threshold, params.timestamp));
    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
async function getChainStatus() {
    const provider = getProvider();
    const [network, blockNumber] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
    return { chainId: Number(network.chainId), blockNumber };
}
async function getWorkflowAdmin(workflowAddress) {
    const contract = getWorkflowContract(workflowAddress);
    return (await contract.admin());
}
async function getWorkflowOrganizationId(workflowAddress) {
    const contract = getWorkflowContract(workflowAddress);
    return (await contract.organizationId());
}
async function getWorkflowName(workflowAddress) {
    const contract = getWorkflowContract(workflowAddress);
    return (await contract.name());
}
async function getWorkflowCreatedAt(workflowAddress) {
    const contract = getWorkflowContract(workflowAddress);
    return Number((await contract.createdAt()));
}
async function getWorkflowSteps(workflowAddress) {
    const contract = getWorkflowContract(workflowAddress);
    const steps = (await contract.getSteps());
    return steps.map((step) => {
        const role = (0, shared_1.roleFromChainId)(Number(step.requiredRole));
        if (role === "none") {
            throw new Error(`Workflow at ${workflowAddress} reports a step with requiredRole none: contract/ABI mismatch`);
        }
        return {
            name: step.name,
            requiredRole: role,
            assignee: step.assignee,
            specificationHash: step.deliverableHash,
        };
    });
}
async function getParticipantRole(workflowAddress, participant) {
    const contract = getWorkflowContract(workflowAddress);
    const role = (await contract.authorizedParticipants(assertAddress(participant, "participant")));
    return (0, shared_1.roleFromChainId)(Number(role));
}
async function getBatchState(workflowAddress, batchId) {
    const contract = getWorkflowContract(workflowAddress);
    const result = (await contract.batches(batchId));
    const [currentCustodian, currentStepIndex, status, updatedAt] = result;
    return {
        currentCustodian,
        currentStepIndex: Number(currentStepIndex),
        status: (0, shared_1.batchStatusFromChain)(Number(status)),
        updatedAt: Number(updatedAt),
    };
}
/**
 * FR-10: full custody history for a batch, read straight from `CustodyTransferred` logs
 * rather than contract storage.
 */
async function getCustodyHistory(workflowAddress, batchId, fromBlock = "earliest", toBlock = "latest") {
    const contract = getWorkflowContract(workflowAddress);
    const filter = contract.filters.CustodyTransferred(batchId);
    const logs = (await contract.queryFilter(filter, fromBlock, toBlock));
    return logs
        .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
        .map((log) => ({
        workflowAddress,
        batchId: log.args.batchId,
        from: log.args.from,
        to: log.args.to,
        stepIndex: Number(log.args.stepIndex),
        deliverableHash: log.args.deliverableHash,
        dataHash: log.args.dataHash,
        timestamp: Number(log.args.timestamp),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
    }));
}
/** All condition reports (breaching or not is up to the caller to decide via threshold comparison). */
async function getConditionBreaches(workflowAddress, batchId, fromBlock = "earliest", toBlock = "latest") {
    const contract = getWorkflowContract(workflowAddress);
    const filter = contract.filters.ConditionReported(batchId);
    const logs = (await contract.queryFilter(filter, fromBlock, toBlock));
    return logs.map((log) => ({
        workflowAddress,
        batchId: log.args.batchId,
        conditionKey: log.args.conditionKey,
        value: log.args.value,
        threshold: log.args.threshold,
        timestamp: Number(log.args.timestamp),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
    }));
}
// ---------------------------------------------------------------------------
// Signature helpers
//
// Two independent checks happen per transfer: (1) who signed;
// (2) is that address allowed — a state lookup the contract performs
// on-chain (`authorizedParticipants` + the batch's current custodian).
// ---------------------------------------------------------------------------
/**
 * Deterministically hashes the off-chain references of a transfer (docs/context.md §3.3:
 * only the hash reaches the chain). Both sides of the boundary must use this exact
 * formula — the client signs the transfer digest built over the resulting `dataHash`,
 * and the API recomputes it to verify that signature — so key order and reference order
 * matter. Keep in sync with any client-side implementation.
 */
function buildDataHash(params) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(JSON.stringify({
        locationReference: params.locationReference ?? null,
        conditionReferences: params.conditionReferences,
    })));
}
/**
 * Builds the digest the current custodian must sign to authorize a transfer. Binds the
 * workflow address and chain id into the hash so a signature can't be replayed against a
 * different workflow or network.
 */
function buildTransferDigest(params) {
    return ethers_1.ethers.solidityPackedKeccak256(["address", "uint256", "uint256", "address", "bytes32", "bytes32"], [
        assertAddress(params.workflowAddress, "workflowAddress"),
        BigInt(params.chainId),
        params.batchId,
        assertAddress(params.to, "to"),
        assertBytes32(params.deliverableHash, "deliverableHash"),
        assertBytes32(params.dataHash, "dataHash"),
    ]);
}
/**
 * Recovers the address that produced `signature` over `digest` (EIP-191 personal-sign
 * style, matching a frontend calling `signer.signMessage`). Throws rather than returning
 * a garbage address if the signature is malformed.
 */
function recoverTransferSigner(digest, signature) {
    try {
        return ethers_1.ethers.verifyMessage(ethers_1.ethers.getBytes(digest), signature);
    }
    catch (error) {
        throw new Error(`Could not recover signer from signature: ${error.message}`);
    }
}
function meta(payload) {
    return {
        blockNumber: payload.log.blockNumber,
        transactionHash: payload.log.transactionHash,
        logIndex: payload.log.index,
    };
}
function subscribeToWorkflowEvents(workflowAddress, handlers) {
    const contract = getWorkflowContract(workflowAddress);
    const bindings = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bind = (eventName, listener) => {
        contract.on(eventName, listener);
        bindings.push([eventName, listener]);
    };
    if (handlers.onParticipantRegistered) {
        bind("ParticipantRegistered", (participant, role, payload) => {
            handlers.onParticipantRegistered({ workflowAddress, participant, role: (0, shared_1.roleFromChainId)(Number(role)), ...meta(payload) });
        });
    }
    if (handlers.onParticipantRevoked) {
        bind("ParticipantRevoked", (participant, payload) => {
            handlers.onParticipantRevoked({ workflowAddress, participant, ...meta(payload) });
        });
    }
    if (handlers.onBatchCreated) {
        bind("BatchCreated", (batchId, initialCustodian, payload) => {
            handlers.onBatchCreated({ workflowAddress, batchId, initialCustodian, ...meta(payload) });
        });
    }
    if (handlers.onCustodyTransferred) {
        bind("CustodyTransferred", (batchId, from, to, stepIndex, deliverableHash, dataHash, timestamp, payload) => {
            handlers.onCustodyTransferred({
                workflowAddress,
                batchId,
                from,
                to,
                stepIndex: Number(stepIndex),
                deliverableHash,
                dataHash,
                timestamp: Number(timestamp),
                ...meta(payload),
            });
        });
    }
    if (handlers.onConditionReported) {
        bind("ConditionReported", (batchId, conditionKey, value, threshold, timestamp, payload) => {
            handlers.onConditionReported({
                workflowAddress,
                batchId,
                conditionKey,
                value,
                threshold,
                timestamp: Number(timestamp),
                ...meta(payload),
            });
        });
    }
    if (handlers.onBatchCompromised) {
        bind("BatchCompromised", (batchId, reason, payload) => {
            handlers.onBatchCompromised({ workflowAddress, batchId, reason, ...meta(payload) });
        });
    }
    return () => {
        for (const [eventName, listener] of bindings) {
            contract.off(eventName, listener);
        }
    };
}
/** Lets the API auto-discover new `Workflow` deployments as enterprises onboard. */
function subscribeToFactoryEvents(onWorkflowCreated) {
    const factory = getFactoryContract();
    const listener = (organizationId, workflowAddress, admin, _timestamp, payload) => {
        onWorkflowCreated({ organizationId, workflowAddress, admin, ...meta(payload) });
    };
    factory.on("WorkflowCreated", listener);
    return () => factory.off("WorkflowCreated", listener);
}
