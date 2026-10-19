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

import { ethers } from "ethers";

import {
  WORKFLOW_ABI,
  WORKFLOW_FACTORY_ABI,
  batchStatusFromChain,
  roleFromChainId,
  roleToChainId,
  type BatchStatus,
  type ChainStatus,
  type Role,
  type WorkflowStep,
} from "@provenance/shared";

import { env } from "./config/env.js";

export type BatchState = {
  currentCustodian: string;
  currentStepIndex: number;
  status: BatchStatus;
  updatedAt: number;
};

export type TransferCustodyParams = {
  batchId: bigint;
  to: string;
  deliverableHash: string;
  /** keccak256 hash of off-chain location/condition/document references for this transfer. */
  dataHash: string;
  /** signature produced by the current custodian, see `buildTransferDigest`. */
  signature: string;
};

export type ReportConditionParams = {
  batchId: bigint;
  /** e.g. keccak256("temperature_celsius") — identifies which sensor channel this is. */
  conditionKey: string;
  value: bigint;
  threshold: bigint;
  timestamp: number;
};

export type ChainEventMeta = {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
};

export type WorkflowCreatedEvent = ChainEventMeta & {
  workflowAddress: string;
  admin: string;
};

export type ParticipantRegisteredEvent = ChainEventMeta & {
  workflowAddress: string;
  participant: string;
  role: Role;
};

export type ParticipantRevokedEvent = ChainEventMeta & {
  workflowAddress: string;
  participant: string;
};

export type BatchCreatedEvent = ChainEventMeta & {
  workflowAddress: string;
  batchId: bigint;
  initialCustodian: string;
};

export type CustodyTransferredEvent = ChainEventMeta & {
  workflowAddress: string;
  batchId: bigint;
  from: string;
  to: string;
  stepIndex: number;
  deliverableHash: string;
  dataHash: string;
  timestamp: number;
};

export type ConditionReportedEvent = ChainEventMeta & {
  workflowAddress: string;
  batchId: bigint;
  conditionKey: string;
  value: bigint;
  threshold: bigint;
  timestamp: number;
};

export type BatchCompromisedEvent = ChainEventMeta & {
  workflowAddress: string;
  batchId: bigint;
  reason: string;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function assertAddress(value: string, field = "address"): string {
  if (!ethers.isAddress(value)) {
    throw new Error(`Invalid ${field}: "${value}" is not a valid Ethereum address`);
  }
  return ethers.getAddress(value);
}

export function assertBytes32(value: string, field = "hash"): string {
  if (!ethers.isHexString(value, 32)) {
    throw new Error(`Invalid ${field}: "${value}" must be a 0x-prefixed 32-byte hex string`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Provider / signer — lazily constructed singletons.
// ---------------------------------------------------------------------------

let cachedProvider: ethers.JsonRpcProvider | undefined;
let cachedSigner: ethers.Wallet | undefined;

/** Shared read-only JSON-RPC provider, pinned to the configured chain id. */
export function getProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    const url = env.RPC_URL;
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
    cachedProvider = new ethers.JsonRpcProvider(url, env.CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });
  }
  return cachedProvider;
}

/**
 * Signer used for state-changing calls (registering participants, submitting transfers,
 * reporting conditions). Only required for write paths.
 */
export function getSigner(): ethers.Wallet {
  if (!cachedSigner) {
    const privateKey = env.TRANSACTION_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "TRANSACTION_SIGNER_PRIVATE_KEY is not set; this operation requires a funded signer",
      );
    }
    cachedSigner = new ethers.Wallet(privateKey, getProvider());
  }
  return cachedSigner;
}

/** Test/shutdown helper: drop cached provider+signer so the next call reconstructs them. */
export function resetConnections(): void {
  cachedProvider?.destroy();
  cachedProvider = undefined;
  cachedSigner = undefined;
}

// ---------------------------------------------------------------------------
// Contract handles
// ---------------------------------------------------------------------------

export function getFactoryContract(withSigner = false): ethers.Contract {
  const address = env.WORKFLOW_FACTORY_ADDRESS;
  if (!address) {
    throw new Error("WORKFLOW_FACTORY_ADDRESS is not configured");
  }
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(assertAddress(address, "WORKFLOW_FACTORY_ADDRESS"), WORKFLOW_FACTORY_ABI, runner);
}

export function getWorkflowContract(workflowAddress: string, withSigner = false): ethers.Contract {
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(assertAddress(workflowAddress, "workflowAddress"), WORKFLOW_ABI, runner);
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function toChainError(action: string, error: unknown): Error {
  const details =
    (error as { reason?: string }).reason ??
    (error as { shortMessage?: string }).shortMessage ??
    (error instanceof Error ? error.message : String(error));
  return new Error(`${action} failed: ${details}`);
}

async function sendAndWait(action: string, call: () => Promise<ethers.ContractTransactionResponse>) {
  let tx: ethers.ContractTransactionResponse;
  try {
    tx = await call();
  } catch (error) {
    throw toChainError(action, error);
  }
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`${action} failed: transaction was not mined`);
  }
  return receipt;
}

function findEventLog(
  receipt: ethers.ContractTransactionReceipt,
  contract: ethers.Contract,
  eventName: string,
): ethers.EventLog | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== (contract.target as string).toLowerCase()) continue;
    const parsed = contract.interface.parseLog(log);
    if (parsed?.name === eventName) {
      return log as ethers.EventLog;
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
export async function createWorkflow(
  steps: WorkflowStep[],
): Promise<{ workflowAddress: string; admin: string; txHash: string; blockNumber: number }> {
  if (steps.length === 0) {
    throw new Error("A workflow must define at least one step");
  }
  for (const step of steps) assertBytes32(step.specificationHash, "step.specificationHash");

  const factory = getFactoryContract(true);
  const receipt = await sendAndWait("createWorkflow", () =>
    factory.createWorkflow(
      steps.map((step) => ({
        name: step.name,
        requiredRole: roleToChainId(step.requiredRole),
        deliverableHash: step.specificationHash,
      })),
    ),
  );

  const log = findEventLog(receipt, factory, "WorkflowCreated");
  if (!log) {
    throw new Error("createWorkflow succeeded but no WorkflowCreated event was found in the receipt");
  }
  const parsed = factory.interface.parseLog(log)!;
  return {
    workflowAddress: parsed.args.workflow as string,
    admin: parsed.args.admin as string,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

// ---------------------------------------------------------------------------
// Writes — workflow instance
// ---------------------------------------------------------------------------

/** FR-01: register an authorized identity for a role in this workflow. Admin-only on-chain. */
export async function registerParticipant(
  workflowAddress: string,
  participant: string,
  role: Role,
): Promise<{ txHash: string; blockNumber: number }> {
  assertAddress(participant, "participant");
  if (role === "none") {
    throw new Error("Cannot register a participant with the role 'none'");
  }
  const contract = getWorkflowContract(workflowAddress, true);
  const receipt = await sendAndWait("registerParticipant", () =>
    contract.registerParticipant(participant, roleToChainId(role)),
  );
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Companion to registerParticipant: swap/replace a participant without redeploying (§3.4). */
export async function revokeParticipant(
  workflowAddress: string,
  participant: string,
): Promise<{ txHash: string; blockNumber: number }> {
  assertAddress(participant, "participant");
  const contract = getWorkflowContract(workflowAddress, true);
  const receipt = await sendAndWait("revokeParticipant", () => contract.revokeParticipant(participant));
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Seeds on-chain state for a new batch at step 0 with its first custodian. */
export async function createBatch(
  workflowAddress: string,
  batchId: bigint,
  initialCustodian: string,
): Promise<{ txHash: string; blockNumber: number }> {
  assertAddress(initialCustodian, "initialCustodian");
  const contract = getWorkflowContract(workflowAddress, true);
  const receipt = await sendAndWait("createBatch", () => contract.createBatch(batchId, initialCustodian));
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * FR-02..FR-07: records a custody transfer.
 */
export async function transferCustody(
  workflowAddress: string,
  params: TransferCustodyParams,
): Promise<{ txHash: string; blockNumber: number; event: CustodyTransferredEvent }> {
  assertAddress(params.to, "to");
  assertBytes32(params.deliverableHash, "deliverableHash");
  assertBytes32(params.dataHash, "dataHash");

  const contract = getWorkflowContract(workflowAddress, true);
  const receipt = await sendAndWait("transferCustody", () =>
    contract.transferCustody(params.batchId, params.to, params.deliverableHash, params.dataHash, params.signature),
  );

  const log = findEventLog(receipt, contract, "CustodyTransferred");
  if (!log) {
    throw new Error("transferCustody succeeded but no CustodyTransferred event was found in the receipt");
  }
  const parsed = contract.interface.parseLog(log)!;
  const event: CustodyTransferredEvent = {
    workflowAddress,
    batchId: parsed.args.batchId as bigint,
    from: parsed.args.from as string,
    to: parsed.args.to as string,
    stepIndex: Number(parsed.args.stepIndex),
    deliverableHash: parsed.args.deliverableHash as string,
    dataHash: parsed.args.dataHash as string,
    timestamp: Number(parsed.args.timestamp),
    blockNumber: receipt.blockNumber,
    transactionHash: receipt.hash,
    logIndex: log.index,
  };
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber, event };
}

/** FR-08/FR-09: submit a sensor reading. */
export async function reportCondition(
  workflowAddress: string,
  params: ReportConditionParams,
): Promise<{ txHash: string; blockNumber: number }> {
  assertBytes32(params.conditionKey, "conditionKey");
  const contract = getWorkflowContract(workflowAddress, true);
  const receipt = await sendAndWait("reportCondition", () =>
    contract.reportCondition(params.batchId, params.conditionKey, params.value, params.threshold, params.timestamp),
  );
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getChainStatus(): Promise<ChainStatus> {
  const provider = getProvider();
  const [network, blockNumber] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
  return { chainId: Number(network.chainId), blockNumber };
}

export async function getWorkflowAdmin(workflowAddress: string): Promise<string> {
  const contract = getWorkflowContract(workflowAddress);
  return (await contract.admin()) as string;
}

export async function getWorkflowSteps(workflowAddress: string): Promise<WorkflowStep[]> {
  const contract = getWorkflowContract(workflowAddress);
  const steps = (await contract.getSteps()) as Array<{ name: string; requiredRole: bigint; deliverableHash: string }>;
  return steps.map((step) => {
    const role = roleFromChainId(Number(step.requiredRole));
    if (role === "none") {
      throw new Error(`Workflow at ${workflowAddress} reports a step with requiredRole none: contract/ABI mismatch`);
    }
    return {
      name: step.name,
      requiredRole: role,
      specificationHash: step.deliverableHash,
    };
  });
}

export async function getParticipantRole(workflowAddress: string, participant: string): Promise<Role> {
  const contract = getWorkflowContract(workflowAddress);
  const role = (await contract.authorizedParticipants(assertAddress(participant, "participant"))) as bigint;
  return roleFromChainId(Number(role));
}

export async function getBatchState(workflowAddress: string, batchId: bigint): Promise<BatchState> {
  const contract = getWorkflowContract(workflowAddress);
  const result = (await contract.batches(batchId)) as [string, bigint, bigint, bigint];
  const [currentCustodian, currentStepIndex, status, updatedAt] = result;
  return {
    currentCustodian,
    currentStepIndex: Number(currentStepIndex),
    status: batchStatusFromChain(Number(status)),
    updatedAt: Number(updatedAt),
  };
}

/**
 * FR-10: full custody history for a batch, read straight from `CustodyTransferred` logs
 * rather than contract storage.
 */
export async function getCustodyHistory(
  workflowAddress: string,
  batchId: bigint,
  fromBlock: number | "earliest" = "earliest",
  toBlock: number | "latest" = "latest",
): Promise<CustodyTransferredEvent[]> {
  const contract = getWorkflowContract(workflowAddress);
  const filter = contract.filters.CustodyTransferred(batchId);
  const logs = (await contract.queryFilter(filter, fromBlock, toBlock)) as ethers.EventLog[];

  return logs
    .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
    .map((log) => ({
      workflowAddress,
      batchId: log.args.batchId as bigint,
      from: log.args.from as string,
      to: log.args.to as string,
      stepIndex: Number(log.args.stepIndex),
      deliverableHash: log.args.deliverableHash as string,
      dataHash: log.args.dataHash as string,
      timestamp: Number(log.args.timestamp),
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.index,
    }));
}

/** All condition reports (breaching or not is up to the caller to decide via threshold comparison). */
export async function getConditionBreaches(
  workflowAddress: string,
  batchId: bigint,
  fromBlock: number | "earliest" = "earliest",
  toBlock: number | "latest" = "latest",
): Promise<ConditionReportedEvent[]> {
  const contract = getWorkflowContract(workflowAddress);
  const filter = contract.filters.ConditionReported(batchId);
  const logs = (await contract.queryFilter(filter, fromBlock, toBlock)) as ethers.EventLog[];

  return logs.map((log) => ({
    workflowAddress,
    batchId: log.args.batchId as bigint,
    conditionKey: log.args.conditionKey as string,
    value: log.args.value as bigint,
    threshold: log.args.threshold as bigint,
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
 * Builds the digest the current custodian must sign to authorize a transfer. Binds the
 * workflow address and chain id into the hash so a signature can't be replayed against a
 * different workflow or network.
 */
export function buildTransferDigest(params: {
  workflowAddress: string;
  chainId: number;
  batchId: bigint;
  to: string;
  deliverableHash: string;
  dataHash: string;
}): string {
  return ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "address", "bytes32", "bytes32"],
    [
      assertAddress(params.workflowAddress, "workflowAddress"),
      BigInt(params.chainId),
      params.batchId,
      assertAddress(params.to, "to"),
      assertBytes32(params.deliverableHash, "deliverableHash"),
      assertBytes32(params.dataHash, "dataHash"),
    ],
  );
}

/**
 * Recovers the address that produced `signature` over `digest` (EIP-191 personal-sign
 * style, matching a frontend calling `signer.signMessage`). Throws rather than returning
 * a garbage address if the signature is malformed.
 */
export function recoverTransferSigner(digest: string, signature: string): string {
  try {
    return ethers.verifyMessage(ethers.getBytes(digest), signature);
  } catch (error) {
    throw new Error(`Could not recover signer from signature: ${(error as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Event subscriptions — backbone for the indexer (mirroing mechanism for DB).
// Each subscribe* function returns an `unsubscribe` closure so callers
// can tear listeners down cleanly.
// ---------------------------------------------------------------------------

export type WorkflowEventHandlers = {
  onParticipantRegistered?: (event: ParticipantRegisteredEvent) => void;
  onParticipantRevoked?: (event: ParticipantRevokedEvent) => void;
  onBatchCreated?: (event: BatchCreatedEvent) => void;
  onCustodyTransferred?: (event: CustodyTransferredEvent) => void;
  onConditionReported?: (event: ConditionReportedEvent) => void;
  onBatchCompromised?: (event: BatchCompromisedEvent) => void;
};

function meta(payload: ethers.ContractEventPayload): ChainEventMeta {
  return {
    blockNumber: payload.log.blockNumber,
    transactionHash: payload.log.transactionHash,
    logIndex: payload.log.index,
  };
}

export function subscribeToWorkflowEvents(workflowAddress: string, handlers: WorkflowEventHandlers): () => void {
  const contract = getWorkflowContract(workflowAddress);
  const bindings: Array<[string, ethers.Listener]> = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bind = (eventName: string, listener: (...args: any[]) => void) => {
    contract.on(eventName, listener);
    bindings.push([eventName, listener]);
  };

  if (handlers.onParticipantRegistered) {
    bind("ParticipantRegistered", (participant: string, role: bigint, payload: ethers.ContractEventPayload) => {
      handlers.onParticipantRegistered!({ workflowAddress, participant, role: roleFromChainId(Number(role)), ...meta(payload) });
    });
  }
  if (handlers.onParticipantRevoked) {
    bind("ParticipantRevoked", (participant: string, payload: ethers.ContractEventPayload) => {
      handlers.onParticipantRevoked!({ workflowAddress, participant, ...meta(payload) });
    });
  }
  if (handlers.onBatchCreated) {
    bind("BatchCreated", (batchId: bigint, initialCustodian: string, payload: ethers.ContractEventPayload) => {
      handlers.onBatchCreated!({ workflowAddress, batchId, initialCustodian, ...meta(payload) });
    });
  }
  if (handlers.onCustodyTransferred) {
    bind(
      "CustodyTransferred",
      (
        batchId: bigint,
        from: string,
        to: string,
        stepIndex: bigint,
        deliverableHash: string,
        dataHash: string,
        timestamp: bigint,
        payload: ethers.ContractEventPayload,
      ) => {
        handlers.onCustodyTransferred!({
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
      },
    );
  }
  if (handlers.onConditionReported) {
    bind(
      "ConditionReported",
      (
        batchId: bigint,
        conditionKey: string,
        value: bigint,
        threshold: bigint,
        timestamp: bigint,
        payload: ethers.ContractEventPayload,
      ) => {
        handlers.onConditionReported!({
          workflowAddress,
          batchId,
          conditionKey,
          value,
          threshold,
          timestamp: Number(timestamp),
          ...meta(payload),
        });
      },
    );
  }
  if (handlers.onBatchCompromised) {
    bind("BatchCompromised", (batchId: bigint, reason: string, payload: ethers.ContractEventPayload) => {
      handlers.onBatchCompromised!({ workflowAddress, batchId, reason, ...meta(payload) });
    });
  }

  return () => {
    for (const [eventName, listener] of bindings) {
      contract.off(eventName, listener);
    }
  };
}

/** Lets the API auto-discover new `Workflow` deployments as enterprises onboard. */
export function subscribeToFactoryEvents(onWorkflowCreated: (event: WorkflowCreatedEvent) => void): () => void {
  const factory = getFactoryContract();
  const listener = (workflowAddress: string, admin: string, _timestamp: bigint, payload: ethers.ContractEventPayload) => {
    onWorkflowCreated({ workflowAddress, admin, ...meta(payload) });
  };
  factory.on("WorkflowCreated", listener);
  return () => factory.off("WorkflowCreated", listener);
}
