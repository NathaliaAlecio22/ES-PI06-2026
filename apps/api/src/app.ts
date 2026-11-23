import express, { Request, Response } from "express";

import {
  createBatchRequestSchema,
  createWorkflowRequestSchema,
  participantSchema,
  transferRequestSchema,
  type Batch,
} from "@provenance/shared";

import { prisma } from "./lib/prisma";
import condicoesRouter from "./routes/condicoes";
import custodiaRouter from "./routes/custodia";
import organizacaoRouter from "./routes/organizacao";
import relatoriosRouter from "./routes/relatorios";
import produtosRouter from "./routes/produtos";
import { participantesRouter } from "./routes/participantes";
import authRouter from "./routes/auth";
import transferenciasRouter from "./routes/transferencias";

import { z } from "zod";

import {
  buildDataHash,
  buildTransferDigest,
  createBatch,
  createWorkflow,
  getBatchState,
  getBlockchainHistoryData,
  getChainStatus,
  getParticipantRole,
  recoverTransferSigner,
  registerParticipant,
  revertReasonOf,
  revokeParticipant,
  assertAddress,
  transferCustody,
} from "./blockchain";

import { env } from "./config/env.js";
import { batches, createId, workflows, type StoredWorkflow } from "./store";
import { autenticar } from "./middlewares/auth.middleware";

export const app = express();

const allowedOrigins = (env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((request, response, next) => {
  const origin = request.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(origin && !allowedOrigins.includes(origin) ? 403 : 204);
    return;
  }

  next();
});

app.use(express.json());

// JSON has no bigint type: uint256-shaped ids are serialized as decimal strings on every
// response (numbers would lose precision above Number.MAX_SAFE_INTEGER). `res.json` applies
// this replacer to every route below; the shared schemas coerce the strings back.
app.set(
  "json replacer",
  (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
);

app.use("/api/participantes", participantesRouter);
app.use("/api/produtos", produtosRouter);
app.use("/api/organizacao", organizacaoRouter);
app.use("/api/auth", authRouter);
app.use("/api/transferencias", transferenciasRouter);
app.use("/api/lotes", condicoesRouter);
app.use("/api/custodia", custodiaRouter);
app.use("/api/relatorios", relatoriosRouter);

/**
 * Application auth gates the blockchain-backed admin surface (docs/requirements.md FR-14:
 * application authentication does not replace on-chain checks — the contract remains the
 * authority for role/custody rules; this only stops anonymous API access to mutating routes).
 * Read-only lookups stay public for the documented auditor/consumer actor.
 */
app.use("/api/workflows", (request, response, next) => {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    next();
    return;
  }
  autenticar(request, response, next);
});

app.use("/api/batches", (request, response, next) => {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    next();
    return;
  }
  autenticar(request, response, next);
});

function notFound(response: Response): void {
  response.status(404).json({ error: "Recurso não encontrado" });
}

/** Route params carry ids as decimal strings (the JSON representation); malformed ones are client errors. */
function parseChainId(raw: unknown): bigint | undefined {
  return typeof raw === "string" && /^\d+$/.test(raw) ? BigInt(raw) : undefined;
}

/** Resolves `:workflowId`, replying 400/404 and returning undefined when invalid/unknown. */
function resolveWorkflow(request: Request, response: Response): StoredWorkflow | undefined {
  const id = parseChainId(request.params.workflowId);
  if (id === undefined) {
    response.status(400).json({ error: "Id de workflow inválido" });
    return undefined;
  }
  const workflow = workflows.get(id);
  if (!workflow) {
    notFound(response);
  }
  return workflow;
}

/** Resolves `:batchId`, replying 400/404 and returning undefined when invalid/unknown. */
function resolveBatch(request: Request, response: Response): Batch | undefined {
  const id = parseChainId(request.params.batchId);
  if (id === undefined) {
    response.status(400).json({ error: "Id de lote inválido" });
    return undefined;
  }
  const batch = batches.get(id);
  if (!batch) {
    notFound(response);
  }
  return batch;
}

/**
 * Replies for a failed chain operation. A rejection by the chain itself (contract reverted)
 * is a 409 carrying the decoded reason — a client-fixable conflict; anything else (RPC down,
 * missing configuration) is a 502: the API could not reach its on-chain dependency.
 */
function chainFailure(response: Response, error: unknown): void {
  const revertReason = revertReasonOf(error);
  if (revertReason !== undefined) {
    response.status(409).json({ error: `A blockchain rejeitou a operação: ${revertReason}` });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  response.status(502).json({ error: `Erro de comunicação com a blockchain: ${message}` });
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "provenance-api" });
});

// Shape fixed by `chainStatusSchema` in @provenance/shared: `chainId` + `blockNumber`.
app.get("/api/chain/status", async (_request, response) => {
  try {
    response.json(await getChainStatus());
  } catch (error) {
    chainFailure(response, error);
  }
});

app.get("/api/db-health", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      status: "ok",
      database: "connected",
      message: "Conexão com PostgreSQL estabelecida!",
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error);

    response.status(503).json({
      status: "error",
      database: "disconnected",
      message: "Não foi possível conectar ao PostgreSQL.",
    });
  }
});

app.post("/api/workflows", async (request, response) => {
  const parsed = createWorkflowRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do workflow inválidos", details: parsed.error.issues });
    return;
  }
  // The contract refuses zero deliverable hashes (Workflow.sol constructor); a zero hash is
  // invalid data, so it gets a 400 here instead of letting the chain reject the transaction.
  if (parsed.data.steps.some((step: { specificationHash: string }) => /^0x0{64}$/.test(step.specificationHash))) {
    response.status(400).json({ error: "Hash de especificação da etapa não pode ser zero" });
    return;
  }

  try {
    // Deploys the on-chain Workflow through the factory; `msg.sender` (the configured
    // signer) becomes that instance's admin (docs/context.md §3.5). `adminAddress` above
    // records the enterprise's declared admin — the chain's own admin is the deployer.
    const deployed = await createWorkflow(parsed.data.steps);
    // Chain first, mirror second (docs/context.md §3.3): the workflow only exists locally
    // once the factory transaction is confirmed.
    const workflow: StoredWorkflow = {
      id: createId(),
      ...parsed.data,
      participants: [],
      createdAt: new Date().toISOString(),
      workflowAddress: deployed.workflowAddress,
    };
    workflows.set(workflow.id, workflow);
    response.status(201).json(workflow);
  } catch (error) {
    chainFailure(response, error);
  }
});

app.get("/api/workflows/:workflowId", (request, response) => {
  const workflow = resolveWorkflow(request, response);
  if (!workflow) {
    return;
  }
  response.json(workflow);
});

app.post("/api/workflows/:workflowId/participants", async (request, response) => {
  const workflow = resolveWorkflow(request, response);
  if (!workflow) {
    return;
  }

  const parsed = participantSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do participante inválidos", details: parsed.error.issues });
    return;
  }

  try {
    await registerParticipant(workflow.workflowAddress, parsed.data.address, parsed.data.role);
    workflow.participants.push(parsed.data);
    response.status(201).json(parsed.data);
  } catch (error) {
    chainFailure(response, error);
  }
});

app.delete("/api/workflows/:workflowId/participants/:address", async (request, response) => {
  const workflow = resolveWorkflow(request, response);
  if (!workflow) {
    return;
  }

  let address: string;
  try {
    address = assertAddress(request.params.address, "participant");
  } catch {
    response.status(400).json({ error: "Endereço do participante inválido" });
    return;
  }

  try {
    await revokeParticipant(workflow.workflowAddress, address);
    workflow.participants = workflow.participants.filter(
      (participant:any) => participant.address.toLowerCase() !== address.toLowerCase(),
    );
    response.status(204).end();
  } catch (error) {
    chainFailure(response, error);
  }
});

app.post("/api/batches", async (request, response) => {
  const parsed = createBatchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do lote inválidos", details: parsed.error.issues });
    return;
  }
  const workflow = workflows.get(parsed.data.workflowId);
  if (!workflow) {
    response.status(404).json({ error: "Workflow não encontrado" });
    return;
  }

  // Minted before the call: uint256-shaped ids go to the contract verbatim (see store.ts).
  const batchId = createId();
  try {
    // Same rule the contract enforces in createBatch (Workflow.sol): the first custodian
    // must hold the role required by step 0. Checked here for a clean 409 without spending
    // gas; the contract remains the authority on submit.
    const custodianRole = await getParticipantRole(workflow.workflowAddress, parsed.data.currentCustodian);
    if (custodianRole !== workflow.steps[0].requiredRole) {
      response.status(409).json({ error: "O custodiante inicial não possui o papel exigido pela primeira etapa" });
      return;
    }
    await createBatch(workflow.workflowAddress, batchId, parsed.data.currentCustodian);

    const batch: Batch = {
      id: batchId,
      ...parsed.data,
      currentStepIndex: 0,
      status: "ACTIVE",
      transfers: [],
      createdAt: new Date().toISOString(),
    };
    batches.set(batch.id, batch);
    response.status(201).json(batch);
  } catch (error) {
    chainFailure(response, error);
  }
});

app.post("/api/batches/:batchId/transfers", async (request, response) => {
  const batch = resolveBatch(request, response);
  if (!batch) {
    return;
  }
  if (batch.status !== "ACTIVE") {
    response.status(409).json({ error: "O lote está comprometido e não aceita transferências" });
    return;
  }

  const parsed = transferRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados da transferência inválidos", details: parsed.error.issues });
    return;
  }
  if (parsed.data.from !== batch.currentCustodian || parsed.data.stepIndex !== batch.currentStepIndex) {
    response.status(409).json({ error: "Custódia ou etapa atual não corresponde ao lote" });
    return;
  }

  const workflow = workflows.get(batch.workflowId);
  if (!workflow) {
    notFound(response);
    return;
  }
  // FR-05: the contract refuses transfers out of the final step; same rule, checked here
  // before any gas is spent.
  if (batch.currentStepIndex + 1 >= workflow.steps.length) {
    response.status(409).json({ error: "O lote já concluiu a etapa final do workflow" });
    return;
  }

  // FR-03: verify the signature off-chain with the same math the contract runs
  // (docs/context.md §3.6, check 1) — a bad signature is rejected before spending gas.
  // `dataHash` binds the off-chain references into the signed digest; both sides must
  // derive it with the same formula (see `buildDataHash` in blockchain.ts).
  const dataHash = buildDataHash({
    locationReference: parsed.data.locationReference,
    conditionReferences: parsed.data.conditionReferences,
  });
  const digest = buildTransferDigest({
    workflowAddress: workflow.workflowAddress,
    chainId: env.CHAIN_ID,
    batchId: batch.id,
    to: parsed.data.to,
    deliverableHash: parsed.data.deliverableHash,
    dataHash,
  });
  try {
    const signer = recoverTransferSigner(digest, parsed.data.signature);
    if (signer !== parsed.data.from) {
      response.status(401).json({ error: "Assinatura não corresponde ao remetente informado" });
      return;
    }
  } catch {
    response.status(401).json({ error: "Assinatura inválida" });
    return;
  }

  try {
    // FR-04: the sender must hold the current step's role and the recipient the next
    // step's — two on-chain reads (free); the contract re-checks both on submit.
    const [fromRole, toRole] = await Promise.all([
      getParticipantRole(workflow.workflowAddress, parsed.data.from),
      getParticipantRole(workflow.workflowAddress, parsed.data.to),
    ]);
    if (fromRole !== workflow.steps[batch.currentStepIndex].requiredRole) {
      response.status(409).json({ error: "O remetente não possui o papel exigido pela etapa atual" });
      return;
    }
    if (toRole !== workflow.steps[batch.currentStepIndex + 1].requiredRole) {
      response.status(409).json({ error: "O destinatário não possui o papel exigido pela próxima etapa" });
      return;
    }

    const result = await transferCustody(workflow.workflowAddress, {
      batchId: batch.id,
      to: parsed.data.to,
      deliverableHash: parsed.data.deliverableHash,
      dataHash,
      signature: parsed.data.signature,
    });

    // Mirror the confirmed on-chain event (the record of truth), not the raw request.
    const transfer = { id: createId(), ...parsed.data, createdAt: new Date().toISOString() };
    batch.transfers.push(transfer);
    batch.currentCustodian = result.event.to;
    batch.currentStepIndex = result.event.stepIndex;
    response.status(201).json(transfer);
  } catch (error) {
    chainFailure(response, error);
  }
});

app.get("/api/batches/:batchId/history", (request, response) => {
  const batch = resolveBatch(request, response);
  if (!batch) {
    return;
  }
  response.json({ batchId: batch.id, status: batch.status, transfers: batch.transfers });
});

app.get("/api/blockchain/history", async (_request, response) => {
  try {
    const [movements, movementCount] = await Promise.all([
      prisma.movimentacao.findMany({
        where: { tx_hash: { not: null } },
        orderBy: [{ data_movimentacao: "desc" }, { id: "desc" }],
        take: 100,
        include: {
          lote: { include: { produto: true } },
          participante_movimentacao_origem_idToparticipante: true,
          participante_movimentacao_destino_idToparticipante: true,
        },
      }),
      prisma.movimentacao.count({ where: { tx_hash: { not: null } } }),
    ]);

    const indexedTransactions = movements.flatMap((movement) =>
      movement.tx_hash
        ? [{
          hash: movement.tx_hash,
          event: "Transferência de custódia",
          item: `${movement.lote.codigo} — ${movement.lote.produto.nome}`,
          party: movement.participante_movimentacao_destino_idToparticipante.nome,
          from: movement.participante_movimentacao_origem_idToparticipante?.wallet_address ?? undefined,
          to: movement.participante_movimentacao_destino_idToparticipante.wallet_address ?? undefined,
          date: movement.data_movimentacao?.toISOString() ?? "",
          location: movement.localizacao ?? undefined,
        }]
        : [],
    );

    const chainHistory = await getBlockchainHistoryData(
      indexedTransactions.map((transaction) => transaction.hash),
    );
    const detailsByHash = new Map(
      chainHistory.transactions.map((transaction) => [transaction.hash.toLowerCase(), transaction]),
    );
    const transactions = indexedTransactions.map((transaction) => {
      const details = detailsByHash.get(transaction.hash.toLowerCase());
      return {
        ...transaction,
        block: details?.blockNumber ?? null,
        date: details?.timestamp ?? transaction.date,
        status: details?.status ?? "Em análise",
        txHash: transaction.hash,
        previousBlockHash: details?.previousBlockHash ?? undefined,
        contractAddress: details?.contractAddress ?? undefined,
        confirmations: details?.confirmations ?? undefined,
      };
    });

    response.status(200).json({
      stats: {
        totalBlocks: chainHistory.totalBlocks,
        totalTransactions: movementCount,
        lastBlockTime: chainHistory.lastBlockTime,
        networkStatus: chainHistory.networkStatus,
      },
      blocks: chainHistory.blocks,
      transactions,
    });
  } catch (error) {
    console.error("Erro ao consultar histórico Blockchain:", error);
    chainFailure(response, error);
  }
});

app.use((_error: unknown, _request: Request, response: Response, _next: unknown) => {
  response.status(500).json({ error: "Erro interno do servidor" });
});
