import express, { Request, Response } from "express";

import {
  createBatchRequestSchema,
  createWorkflowRequestSchema,
  participantSchema,
  transferRequestSchema,
  type Batch,
  type Workflow,
} from "@provenance/shared";

import { batches, createId, workflows } from "./store";

export const app = express();
app.use(express.json());

// JSON has no bigint type: uint256-shaped ids are serialized as decimal strings on every
// response (numbers would lose precision above Number.MAX_SAFE_INTEGER). `res.json` applies
// this replacer to every route below; the shared schemas coerce the strings back.
app.set(
  "json replacer",
  (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
);

function notFound(response: Response): void {
  response.status(404).json({ error: "Recurso não encontrado" });
}

/** Route params carry ids as decimal strings (the JSON representation); malformed ones are client errors. */
function parseChainId(raw: unknown): bigint | undefined {
  return typeof raw === "string" && /^\d+$/.test(raw) ? BigInt(raw) : undefined;
}

/** Resolves `:workflowId`, replying 400/404 and returning undefined when invalid/unknown. */
function resolveWorkflow(request: Request, response: Response): Workflow | undefined {
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

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "provenance-api" });
});

app.post("/api/workflows", (request, response) => {
  const parsed = createWorkflowRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do workflow inválidos", details: parsed.error.issues });
    return;
  }

  const workflow = {
    id: createId(),
    ...parsed.data,
    participants: [],
    createdAt: new Date().toISOString(),
  };
  workflows.set(workflow.id, workflow);
  response.status(201).json(workflow);
});

app.get("/api/workflows/:workflowId", (request, response) => {
  const workflow = resolveWorkflow(request, response);
  if (!workflow) {
    return;
  }
  response.json(workflow);
});

app.post("/api/workflows/:workflowId/participants", (request, response) => {
  const workflow = resolveWorkflow(request, response);
  if (!workflow) {
    return;
  }

  const parsed = participantSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do participante inválidos", details: parsed.error.issues });
    return;
  }

  workflow.participants.push(parsed.data);
  response.status(201).json(parsed.data);
});

app.post("/api/batches", (request, response) => {
  const parsed = createBatchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Dados do lote inválidos", details: parsed.error.issues });
    return;
  }
  if (!workflows.has(parsed.data.workflowId)) {
    response.status(404).json({ error: "Workflow não encontrado" });
    return;
  }

  const batch = {
    id: createId(),
    ...parsed.data,
    currentStepIndex: 0,
    status: "ACTIVE" as const,
    transfers: [],
    createdAt: new Date().toISOString(),
  };
  batches.set(batch.id, batch);
  response.status(201).json(batch);
});

app.post("/api/batches/:batchId/transfers", (request, response) => {
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

  const transfer = { id: createId(), ...parsed.data, createdAt: new Date().toISOString() };
  batch.transfers.push(transfer);
  batch.currentCustodian = transfer.to;
  batch.currentStepIndex += 1;
  response.status(201).json(transfer);
});

app.get("/api/batches/:batchId/history", (request, response) => {
  const batch = resolveBatch(request, response);
  if (!batch) {
    return;
  }
  response.json({ batchId: batch.id, status: batch.status, transfers: batch.transfers });
});

app.use((_error: unknown, _request: Request, response: Response, _next: unknown) => {
  response.status(500).json({ error: "Erro interno do servidor" });
});