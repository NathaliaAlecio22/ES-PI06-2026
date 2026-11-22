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
 * - Each organization gets one of the 10 standard Hardhat accounts as its on-chain
 *   identity (see ./hardhat-accounts.ts) — a custodial signer model for the PoC.
 * - Each organization owns one `Workflow` contract, created at signup (or lazily on its
 *   first product). Step 0 is always the organization's own role; the admin picks the
 *   following steps at signup (documented defaults when skipped).
 * - `specificationHash` per step is the keccak256 of a deterministic JSON descriptor —
 *   FR-13 is deliberately minimal for the PoC: steps carry name/role/document-hash only,
 *   and the "deliverable specification" is this generated descriptor, not an uploaded
 *   document. Keep the descriptor shape stable: it is what the hash commits to.
 */

/** TraceBlock's participant types (the signup vocabulary) → on-chain roles. */
const TIPO_TO_ROLE: Record<string, Role> = {
  Fabricante: "manufacturer",
  Distribuidor: "distributor",
  Transportadora: "carrier",
  "Centro de armazenamento": "distribution_center",
  Varejista: "retailer",
};

/** Portuguese step names for the workflow builder UI and on-chain readability. */
const ROLE_STEP_NAME: Record<Role, string> = {
  none: "—",
  manufacturer: "Fabricação",
  distributor: "Distribuição",
  carrier: "Transporte",
  distribution_center: "Armazenamento",
  retailer: "Varejo",
  admin: "Administração",
};

/** Fallback chain used when an organization skips the workflow setup at signup. */
const DEFAULT_SUBSEQUENT_TYPES: string[] = [
  "Distribuidor",
  "Transportadora",
  "Varejista",
];

export function chainRoleForTipo(tipo: string): Role {
  const role = TIPO_TO_ROLE[tipo];
  if (!role) {
    throw new Error(`Tipo de participante desconhecido: "${tipo}"`);
  }
  return role;
}

export function stepNameForRole(role: Role): string {
  return ROLE_STEP_NAME[role];
}

/**
 * Deterministic keccak256 of a step's deliverable descriptor — the only thing the chain
 * ever sees of the specification (docs/context.md §3.3). Key order matters.
 */
export function specificationHashForStep(params: {
  organization: string;
  index: number;
  name: string;
  role: Role;
}): string {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        organization: params.organization,
        step: params.index,
        name: params.name,
        requiredRole: params.role,
      }),
    ),
  );
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
 * Builds the ordered workflow steps for an organization: step 0 is always the
 * organization's own role (it is the initial custodian of every batch it creates),
 * followed by the admin's chosen participant types (or the documented defaults).
 */
export function buildWorkflowSteps(params: {
  organization: string;
  ownRole: Role;
  subsequentTypes: string[];
}): WorkflowStep[] {
  type AssignableRole = Exclude<Role, "none">;
  const seen = new Set<AssignableRole>();
  const roles: AssignableRole[] = [params.ownRole as AssignableRole];
  for (const tipo of params.subsequentTypes) {
    const role = chainRoleForTipo(tipo);
    if (role === params.ownRole || role === "none" || seen.has(role)) continue;
    seen.add(role);
    roles.push(role);
  }

  return roles.map((role, index) => ({
    name: stepNameForRole(role),
    requiredRole: role,
    specificationHash: specificationHashForStep({
      organization: params.organization,
      index,
      name: stepNameForRole(role),
      role,
    }),
  }));
}

export function defaultSubsequentTypes(): string[] {
  return [...DEFAULT_SUBSEQUENT_TYPES];
}

/**
 * Creates the organization's on-chain workflow and registers the organization itself for
 * step 0's role. Returns the data the caller must persist on the `participante` row.
 *
 * Chain first, database second (docs/context.md §3.3): if the chain call fails, nothing
 * is persisted; if the database write fails afterwards, the workflow stays deployed on
 * the (resettable local) chain — an accepted PoC trade-off, noted at the call sites.
 */
export async function deployWorkflowForOrganization(params: {
  organization: string;
  ownRole: Role;
  steps: WorkflowStep[];
  adminPrivateKey: string;
}): Promise<{ workflowAddress: string; steps: WorkflowStep[] }> {
  const deployed = await createWorkflow(params.steps, params.adminPrivateKey);
  // The organization is its own admin: register it for step 0's role so it can hold
  // custody of the batches it creates (createBatch requires the initial custodian to
  // hold steps[0].requiredRole).
  const ownAddress = new ethers.Wallet(params.adminPrivateKey).address;
  await registerParticipant(deployed.workflowAddress, ownAddress, params.ownRole, params.adminPrivateKey);
  return { workflowAddress: deployed.workflowAddress, steps: params.steps };
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
 * Allocates the next free Hardhat account for a new organization. The pool has 10
 * accounts — the PoC is capped at 10 simultaneously registered organizations.
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
// Lazy workflow bootstrap — organizations registered before this consolidation
// (or through a flow that skipped the setup) get a default workflow on first use.
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
 * Guarantees the organization has an on-chain workflow, deploying the documented
 * default chain lazily if needed. Returns the workflow address, its steps, and
 * the organization's signer key. The caller supplies rows fetched with
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

  // Lazy default deploy for organizations predating the consolidation.
  if (!participante.tipo) {
    throw new Error("A organização não possui tipo definido para construir seu workflow.");
  }
  const ownRole = chainRoleForTipo(participante.tipo);
  const built = buildWorkflowSteps({
    organization: participante.nome,
    ownRole,
    subsequentTypes: defaultSubsequentTypes(),
  });
  const deployed = await deployWorkflowForOrganization({
    organization: participante.nome,
    ownRole,
    steps: built,
    adminPrivateKey: signerKey,
  });
  await prisma.participante.update({
    where: { id: participante.id },
    data: {
      workflow_address: deployed.workflowAddress,
      workflow_steps: deployed.steps,
    },
  });
  return { workflowAddress: deployed.workflowAddress, steps: deployed.steps, signerKey };
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

  for (const channel of channels) {
    if (channel.value == null) continue;
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
    reported.push({
      channel: channel.channel,
      value: channel.value,
      threshold: channel.threshold,
      breached: channel.value > channel.threshold,
    });
  }
  return reported;
}

/** Re-exported so route files have one place for chain-error classification. */
export { revertReasonOf };
