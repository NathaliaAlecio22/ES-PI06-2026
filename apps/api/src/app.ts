import express, { Request, Response } from "express";
import { batches, createId, workflows } from "./store";
import { batchSchema, participantSchema, transferSchema, workflowSchema } from "./schemas";

export const app = express();
app.use(express.json());

function notFound(response: Response): void {
  response.status(404).json({ error: "Recurso não encontrado" });
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "provenance-api" });
});

app.post("/api/workflows", (request, response) => {
  const parsed = workflowSchema.safeParse(request.body);
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
  const workflow = workflows.get(request.params.workflowId);
  if (!workflow) {
    notFound(response);
    return;
  }
  response.json(workflow);
});

app.post("/api/workflows/:workflowId/participants", (request, response) => {
  const workflow = workflows.get(request.params.workflowId);
  if (!workflow) {
    notFound(response);
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
  const parsed = batchSchema.safeParse(request.body);
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
  const batch = batches.get(request.params.batchId);
  if (!batch) {
    notFound(response);
    return;
  }
  if (batch.status !== "ACTIVE") {
    response.status(409).json({ error: "O lote está comprometido e não aceita transferências" });
    return;
  }

  const parsed = transferSchema.safeParse(request.body);
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
  const batch = batches.get(request.params.batchId);
  if (!batch) {
    notFound(response);
    return;
  }
  response.json({ batchId: batch.id, status: batch.status, transfers: batch.transfers });
});

app.use((_error: unknown, _request: Request, response: Response, _next: unknown) => {
  response.status(500).json({ error: "Erro interno do servidor" });
});