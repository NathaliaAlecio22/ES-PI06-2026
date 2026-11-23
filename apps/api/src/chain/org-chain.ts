import { ethers } from "ethers";

import type { Prisma } from "@prisma/client";
import type { Role, WorkflowStep } from "@provenance/shared";

import { env } from "../config/env";
import {
  createWorkflow,
  getParticipantRole,
  registerParticipant,
  reportCondition,
  revertReasonOf,
} from "../blockchain";
import { prisma } from "../lib/prisma";
import { privateKeyForAddress } from "./hardhat-accounts";

/**
 * Service layer binding organizations (Postgres `participante` rows) to their on-chain
 * identity and workflow. Consolidation decisions live here, in one place:
 *
 * - Each organization gets one of the standard Hardhat accounts 1–19 as its on-chain
 *   identity (see ./hardhat-accounts.ts) — a custodial signer model for the PoC.
 * - Each organization owns at most one `Workflow` contract, created explicitly from the
 *   "Cadeia de custódia" tab (routes/cadeia.ts). The organization is the workflow's admin
 *   and need not hold a step itself; there is no default chain.
 * - `specificationHash` per step is the keccak256 of the step's specification text.
 */

/** TraceBlock's participant types (the signup vocabulary) → on-chain roles. */
const TIPO_TO_ROLE: Record<string, Role> = {
  Fabricante: "manufacturer",
  Distribuidor: "distributor",
  Transportadora: "carrier",
  "Centro de armazenamento": "distribution_center",
  Varejista: "retailer",
};

/** Thrown when an organization acts on a custody chain it has not created yet. */
export class OrganizationWithoutChainError extends Error {
  constructor() {
    super("Crie a cadeia de custódia da organização antes de cadastrar produtos ou lotes.");
    this.name = "OrganizationWithoutChainError";
  }
}

export function chainRoleForTipo(tipo: string): Role {
  const role = TIPO_TO_ROLE[tipo];
  if (!role) {
    throw new Error(`Tipo de participante desconhecido: "${tipo}"`);
  }
  return role;
}

/**
 * Same idea for a transfer's deliverable: the chain stores only the hash of the
 * delivery descriptor (lot, quantity, location, conditions, notes).
 */
export function deliverableHashForTransfer(params: {
  lot: string;
  product: string;
  quantity: string | null;
  unit: string | null;
  location: string | null;
  notes: string | null;
  temperature: string | null;
  humidity: string | null;
}): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(params)));
}

/**
 * Registers `participant` for `role` in `workflowAddress` (signed by the workflow's
 * admin key) if — and only if — the chain does not already report that role for it.
 * Used to onboard destination organizations into the origin's workflow lazily, the
 * first time they are chosen as a transfer destination.
 */
export async function ensureParticipantRegistered(params: {
  workflowAddress: string;
  participant: string;
  role: Role;
  adminPrivateKey: string;
}): Promise<void> {
  const currentRole = await getParticipantRole(params.workflowAddress, params.participant);
  if (currentRole === params.role) {
    return;
  }
  await registerParticipant(
    params.workflowAddress,
    params.participant,
    params.role,
    params.adminPrivateKey,
  );
}

/**
 * Allocates the next free Hardhat account for a new organization. The pool is accounts
 * 1–19 (0 is reserved) — the PoC is capped at 19 simultaneously registered organizations.
 */
export async function allocateAccountForNewOrganization(): Promise<{
  address: string;
  privateKey: string;
}> {
  const participants = await prisma.participante.findMany({
    select: { wallet_address: true },
  });
  const used = participants
    .map((participant) => participant.wallet_address)
    .filter((address): address is string => Boolean(address));
  const { allocateChainAccount } = await import("./hardhat-accounts");
  const account = allocateChainAccount(used);
  return { address: account.address, privateKey: account.privateKey };
}

/** Private key of an organization's on-chain account, by its stored wallet address. */
export function orgSignerKey(walletAddress: string): string {
  return privateKeyForAddress(walletAddress);
}

// ---------------------------------------------------------------------------
// Workflow lookup — there is no default chain; see OrganizationWithoutChainError.
// ---------------------------------------------------------------------------

type ParticipanteRow = {
  id: bigint;
  nome: string;
  tipo: string | null;
  wallet_address: string | null;
  workflow_address: string | null;
  workflow_steps: Prisma.JsonValue | null;
};

/**
 * Returns the organization's on-chain workflow address, its steps, and its signer
 * key; throws OrganizationWithoutChainError if no chain was created yet. The caller supplies rows fetched with
 * `participante` included (e.g. through `usuario.participante`).
 */
export async function ensureWorkflowForParticipante(
  participante: ParticipanteRow,
): Promise<{ workflowAddress: string; steps: WorkflowStep[]; signerKey: string }> {
  if (!participante.wallet_address) {
    throw new Error(
      "A organização não possui identidade on-chain (re-cadastre-a com o fluxo atual " +
        "para que uma conta de blockchain seja atribuída).",
    );
  }
  const signerKey = privateKeyForAddress(participante.wallet_address);

  const steps = readStoredSteps(participante.workflow_steps);
  if (participante.workflow_address && steps) {
    return { workflowAddress: participante.workflow_address, steps, signerKey };
  }

  // No default chain: the organization must create its single custody chain first.
  throw new OrganizationWithoutChainError();
}

/** Parses the stored `workflow_steps` JSON back into typed steps. */
export function readStoredSteps(raw: Prisma.JsonValue | null): WorkflowStep[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const steps: WorkflowStep[] = [];
  for (const entry of raw) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "name" in entry &&
      "requiredRole" in entry &&
      "specificationHash" in entry &&
      typeof (entry as { name: unknown }).name === "string" &&
      typeof (entry as { requiredRole: unknown }).requiredRole === "string" &&
      typeof (entry as { specificationHash: unknown }).specificationHash === "string"
    ) {
      steps.push(entry as unknown as WorkflowStep);
    }
  }
  return steps.length > 0 ? steps : undefined;
}

// ---------------------------------------------------------------------------
// Conditions (FR-10/FR-11) — fixed-point ×100 representation on-chain.
// ---------------------------------------------------------------------------

/** keccak256 identifiers for the two condition channels the PoC tracks. */
export const TEMPERATURE_CONDITION_KEY = ethers.keccak256(
  ethers.toUtf8Bytes("temperatura_celsius"),
);
export const HUMIDITY_CONDITION_KEY = ethers.keccak256(ethers.toUtf8Bytes("umidade_percent"));

/** Whole-number fixed-point ×100 — the contract's int256 value/threshold shape. */
export function toFixedPoint(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

export type ReportedCondition = {
  channel: "temperatura_celsius" | "umidade_percent";
  value: number;
  threshold: number;
  breached: boolean;
};

/**
 * Reports one temperature/humidity reading pair on-chain (FR-10/FR-11). A reading above
 * the configured threshold compromises the batch on-chain automatically (Workflow.sol);
 * the caller mirrors that by flagging the lot. Thresholds come from the environment
 * (TEMPERATURE_THRESHOLD_C / HUMIDITY_THRESHOLD_PCT).
 */
export async function reportConditions(params: {
  workflowAddress: string;
  batchId: bigint;
  signerKey: string;
  temperature: number | null;
  humidity: number | null;
}): Promise<ReportedCondition[]> {
  const reported: ReportedCondition[] = [];
  const timestamp = Math.floor(Date.now() / 1000);

  const channels: Array<{
    key: string;
    channel: ReportedCondition["channel"];
    value: number | null;
    threshold: number;
  }> = [
    {
      key: TEMPERATURE_CONDITION_KEY,
      channel: "temperatura_celsius",
      value: params.temperature,
      threshold: env.TEMPERATURE_THRESHOLD_C,
    },
    {
      key: HUMIDITY_CONDITION_KEY,
      channel: "umidade_percent",
      value: params.humidity,
      threshold: env.HUMIDITY_THRESHOLD_PCT,
    },
  ];

  // The contract flags the WHOLE batch (not per-channel) on the first breach and then
  // rejects any further `reportCondition` for it ("batch is compromised"). So once one
  // channel in this call breaches, later channels are mirrored (for the Postgres record)
  // without attempting another on-chain call that would only revert.
  let compromised = false;
  for (const channel of channels) {
    if (channel.value == null) continue;
    const breached = channel.value > channel.threshold;
    if (!compromised) {
      await reportCondition(
        params.workflowAddress,
        {
          batchId: params.batchId,
          conditionKey: channel.key,
          value: toFixedPoint(channel.value),
          threshold: toFixedPoint(channel.threshold),
          timestamp,
        },
        params.signerKey,
      );
      if (breached) compromised = true;
    }
    reported.push({
      channel: channel.channel,
      value: channel.value,
      threshold: channel.threshold,
      breached,
    });
  }
  return reported;
}

/** Re-exported so route files have one place for chain-error classification. */
export { revertReasonOf };
