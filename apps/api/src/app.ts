import express, { Request, Response } from "express";



import {

  createBatchRequestSchema,

  createWorkflowRequestSchema,

  participantSchema,

  transferRequestSchema,

  type Batch,

} from "@provenance/shared";

import relatoriosRouter from "./routes/relatorios";

import { prisma } from "./lib/prisma";

import organizacaoRouter from "./routes/organizacao";

import produtosRouter from "./routes/produtos";

import { participantesRouter } from "./routes/participantes";

import authRouter from "./routes/auth";
import transferenciasRouter from "./routes/transferencias";

import custodiaRouter from "./routes/custodia";





import { z } from "zod";



import {

  buildDataHash,
  buildTransferDigest,
  createBatch,
  createWorkflow,
  getBatchState,
  getBlockchainHistoryData,
  getChainStatus,

  getConditionBreaches,

  getParticipantRole,

  getWorkflowAdmin,

  getWorkflowCreatedAt,

  getWorkflowForOrganization,

  getWorkflowName,

  getWorkflowOrganizationId,

  getWorkflowSteps,

  hashSpecification,

  isWorkflowFactoryVersionError,

  recoverTransferSigner,

  registerParticipant,

  reportCondition,

  revertReasonOf,

  revokeParticipant,

  assertAddress,

  transferCustody,

} from "./blockchain";



import { env } from "./config/env.js";

import { batches, createId, workflows, type StoredWorkflow } from "./store";

import { autenticar } from "./middlewares/auth.middleware";

import { loadCurrentUser, roleFromProfile } from "./utils/session";

import type { Role } from "@provenance/shared";



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



/**

 * PostgreSQL is the persistent mirror used by the application. The blockchain remains

 * authoritative for the deployed contract and transfer execution. If an older deployment

 * exists only on-chain, it is imported into PostgreSQL on first read.

 */

type WorkflowParticipantRole = Exclude<Role, "none">;

function isWorkflowParticipantRole(role: Role): role is WorkflowParticipantRole {
  return role !== "none";
}


async function loadWorkflow(organizationId: bigint): Promise<StoredWorkflow | undefined> {

  const saved = await prisma.cadeia_custodia.findUnique({

    where: { organizacao_id: organizationId },

    include: { etapas: { orderBy: { ordem: "asc" }, include: { responsavel: true } } },

  });



  if (saved) {

    const steps = saved.etapas.map((step) => {
      const requiredRole = step.papel as Role;

      if (!isWorkflowParticipantRole(requiredRole)) {
        throw new Error(`Papel inválido na etapa "${step.nome}": ${requiredRole}`);
      }

      return {
        name: step.nome,
        requiredRole,
        assignee: step.endereco_carteira,
        specificationHash: step.hash_especificacao,
      };
    });

    const participants = [...new Map(

      steps.map((step) => [step.assignee.toLowerCase(), {

        address: step.assignee,

        role: step.requiredRole,

      }]),

    ).values()];

    const workflow: StoredWorkflow = {

      id: organizationId,

      organizationId,

      name: saved.nome,

      adminAddress: saved.endereco_admin,

      workflowAddress: saved.endereco_contrato,

      steps,

      participants,

      createdAt: saved.data_criacao.toISOString(),

    };

    workflows.set(organizationId, workflow);

    return workflow;

  }



  const workflowAddress = await getWorkflowForOrganization(organizationId);

  if (!workflowAddress) return undefined;



  const [onChainSteps, adminAddress, name, createdAt, onChainOrganizationId] = await Promise.all([
    getWorkflowSteps(workflowAddress),
    getWorkflowAdmin(workflowAddress),
    getWorkflowName(workflowAddress),
    getWorkflowCreatedAt(workflowAddress),
    getWorkflowOrganizationId(workflowAddress),
  ]);


  const steps = onChainSteps.map((step) => {
    if (!isWorkflowParticipantRole(step.requiredRole)) {
      throw new Error(`Papel inválido na etapa "${step.name}": ${step.requiredRole}`);
    }

    return step;
  });

  if (onChainOrganizationId !== organizationId) {

    throw new Error("On-chain workflow organization id does not match the requested organization");

  }



  const assignedParticipants = await prisma.participante.findMany({

    where: { wallet_address: { in: steps.map((step) => step.assignee) } },

    select: { id: true, wallet_address: true },

  });

  const participantByWallet = new Map(

    assignedParticipants.map((participant) => [participant.wallet_address?.toLowerCase(), participant.id]),

  );



  // Legacy chain-only workflows do not expose the original plain-text specification.

  // The specification hash is retained exactly; the text remains null in PostgreSQL.

  await prisma.cadeia_custodia.create({

    data: {

      organizacao_id: organizationId,

      nome: name,

      endereco_admin: adminAddress,

      endereco_contrato: workflowAddress,

      data_criacao: new Date(createdAt * 1000),

      etapas: {

        create: steps.map((step, index) => ({

          ordem: index,

          nome: step.name,

          papel: step.requiredRole,

          responsavel_id: participantByWallet.get(step.assignee.toLowerCase()) ?? null,

          endereco_carteira: step.assignee,

          especificacao: null,

          hash_especificacao: step.specificationHash,

        })),

      },

    },

  });



  const participants = [...new Map(

    steps.map((step) => [step.assignee.toLowerCase(), { address: step.assignee, role: step.requiredRole }]),

  ).values()];

  const workflow: StoredWorkflow = {

    id: organizationId,

    organizationId,

    name,

    adminAddress,

    workflowAddress,

    steps,

    participants,

    createdAt: new Date(createdAt * 1000).toISOString(),

  };

  workflows.set(organizationId, workflow);

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

  if (isWorkflowFactoryVersionError(error)) {

    response.status(503).json({ error: error.message });

    return;

  }

  const revertReason = revertReasonOf(error);

  if (revertReason !== undefined) {

    response.status(409).json({ error: `A blockchain rejeitou a operação: ${revertReason}` });

    return;

  }

  const message = error instanceof Error ? error.message : String(error);

  response.status(502).json({ error: `Erro de comunicação com a blockchain: ${message}` });

}



async function loadWorkflowAdministrator(request: Request, response: Response) {

  const user = await loadCurrentUser(request.usuario, response);

  if (!user?.participante_id) return null;

  if (roleFromProfile(user.perfil) !== "ADMIN") {

    response.status(403).json({ error: "Somente administradores podem configurar a cadeia" });

    return null;

  }

  return user;

}



function roleForParticipantType(type: string | null): Role | undefined {

  const roles: Record<string, Role> = {

    Fabricante: "manufacturer",

    Distribuidor: "distributor",

    Transportadora: "carrier",

    "Centro de armazenamento": "distribution_center",

    Varejista: "retailer",

  };

  return type ? roles[type] : undefined;

}



/** Register each wallet assigned to a workflow step, without duplicating on-chain entries. */

async function ensureWorkflowAssignments(workflow: StoredWorkflow): Promise<void> {

  const assignments = [...new Map(

    workflow.steps.map((step) => [step.assignee.toLowerCase(), {

      address: step.assignee,

      role: step.requiredRole,

    }]),

  ).values()];



  for (const assignment of assignments) {

    const registeredRole = await getParticipantRole(workflow.workflowAddress, assignment.address);

    if (registeredRole === "none") {

      await registerParticipant(workflow.workflowAddress, assignment.address, assignment.role);

      continue;

    }

    if (registeredRole !== assignment.role) {

      throw new Error(`A carteira ${assignment.address} está registrada com um papel diferente do definido na etapa`);

    }

  }

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

  const steps = parsed.data.steps.map(({ specification, ...step }) => ({

    ...step,

    specificationHash: hashSpecification(specification),

  }));

  if (steps.some((step, index, allSteps) =>

    index > 0 && step.assignee.toLowerCase() === allSteps[index - 1].assignee.toLowerCase()

  )) {

    response.status(400).json({ error: "Etapas consecutivas devem ter organizações responsáveis diferentes" });

    return;

  }

  const roleByWallet = new Map<string, Role>();

  for (const step of steps) {

    const wallet = step.assignee.toLowerCase();

    const existingRole = roleByWallet.get(wallet);

    if (existingRole && existingRole !== step.requiredRole) {

      response.status(400).json({ error: "A mesma organização não pode assumir papéis diferentes na mesma cadeia" });

      return;

    }

    roleByWallet.set(wallet, step.requiredRole);

  }



  try {

    const user = await loadWorkflowAdministrator(request, response);

    if (!user?.participante_id || !user.participante) return;

    const organizationId = user.participante_id;

    const ownerWallet = user.participante.wallet_address;

    if (!ownerWallet) {

      response.status(409).json({ error: "Cadastre a carteira da sua organização antes de configurar a cadeia" });

      return;

    }

    if (steps[0].assignee.toLowerCase() !== ownerWallet.toLowerCase()) {

      response.status(400).json({ error: "A primeira etapa deve ser atribuída à carteira da sua organização" });

      return;

    }

    const alreadySaved = await prisma.cadeia_custodia.findUnique({

      where: { organizacao_id: organizationId },

      select: { id: true },

    });

    if (alreadySaved || await getWorkflowForOrganization(organizationId)) {

      response.status(409).json({ error: "Sua organização já possui uma cadeia configurada" });

      return;

    }



    const addresses = [
        ...new Set(steps.map((step) => step.assignee.toLowerCase())),
      ];

      const assignedParticipants = await prisma.participante.findMany({
        where: {
          ativo: true,
          wallet_address: {
            in: addresses,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          wallet_address: true,
          tipo: true,
        },
      });

    const participantsByAddress = new Map(

      assignedParticipants.map((participant) => [

        participant.wallet_address?.toLowerCase(),

        roleForParticipantType(participant.tipo),

      ]),

    );

    const invalidAssignment = steps.find(

      (step) => participantsByAddress.get(step.assignee.toLowerCase()) !== step.requiredRole,

    );

    if (invalidAssignment) {

      response.status(400).json({

        error: `A carteira atribuída à etapa "${invalidAssignment.name}" não pertence a um participante ativo com o papel exigido`,

      });

      return;

    }



    const deployed = await createWorkflow(organizationId, parsed.data.name, steps);

    const assignmentsToRegister = [...new Map(

      steps.map((step) => [step.assignee.toLowerCase(), {

        address: step.assignee,

        role: step.requiredRole,

      }]),

    ).values()];

    for (const assignment of assignmentsToRegister) {

      const currentRole = await getParticipantRole(deployed.workflowAddress, assignment.address);

      if (currentRole === "none") {

        await registerParticipant(deployed.workflowAddress, assignment.address, assignment.role);

      } else if (currentRole !== assignment.role) {

        throw new Error(`A carteira ${assignment.address} já está registrada com outro papel na blockchain`);

      }

    }



    const participantIdByAddress = new Map(

      assignedParticipants.map((participant) => [participant.wallet_address?.toLowerCase(), participant.id]),

    );



    // Persist the exact configuration that was deployed. The wallet address is stored as a

    // snapshot so later changes to a participant wallet do not rewrite the on-chain history.

    await prisma.cadeia_custodia.create({

      data: {

        organizacao_id: organizationId,

        nome: parsed.data.name.trim(),

        endereco_admin: deployed.admin,

        endereco_contrato: deployed.workflowAddress,

        tx_hash_criacao: deployed.txHash,

        bloco_criacao: deployed.blockNumber,

        etapas: {

          create: parsed.data.steps.map((inputStep, index) => ({

            ordem: index,

            nome: inputStep.name.trim(),

            papel: steps[index].requiredRole,

            responsavel_id: participantIdByAddress.get(steps[index].assignee.toLowerCase()) ?? null,

            endereco_carteira: steps[index].assignee,

            especificacao: inputStep.specification.trim(),

            hash_especificacao: steps[index].specificationHash,

          })),

        },

      },

    });



    const participants = [...new Map(

      steps.map((step) => [

        step.assignee.toLowerCase(),

        { address: step.assignee, role: step.requiredRole },

      ]),

    ).values()];

    const workflow: StoredWorkflow = {

      id: organizationId,

      organizationId,

      name: parsed.data.name,

      adminAddress: deployed.admin,

      steps,

      participants,

      createdAt: new Date().toISOString(),

      workflowAddress: deployed.workflowAddress,

    };

    workflows.set(organizationId, workflow);

    response.status(201).json(workflow);

  } catch (error) {

    chainFailure(response, error);

  }

});



app.get("/api/workflows/opcoes", async (request, response) => {

  try {

    const user = await loadCurrentUser(request.usuario, response);

    if (!user?.participante_id) return;

    const participants = await prisma.participante.findMany({

      where: { ativo: true },

      select: { id: true, nome: true, tipo: true, wallet_address: true },

      orderBy: { nome: "asc" },

    });

    const workflow = await loadWorkflow(user.participante_id);

    if (workflow && roleFromProfile(user.perfil) === "ADMIN") {

      await ensureWorkflowAssignments(workflow);

    }



    response.json({

      organizationId: user.participante_id.toString(),

      workflow,

      participants: participants.flatMap((participant) => {

        const role = roleForParticipantType(participant.tipo);

        if (!role) return [];

        return [{

          id: participant.id.toString(),

          name: participant.nome,

          address: participant.wallet_address,

          role,

        }];

      }),

    });

  } catch (error) {

    chainFailure(response, error);

  }

});



app.get("/api/workflows/:workflowId", async (request, response) => {

  const organizationId = parseChainId(request.params.workflowId);

  if (organizationId === undefined) {

    response.status(400).json({ error: "Id de workflow inválido" });

    return;

  }

  try {

    const user = await loadCurrentUser(request.usuario, response);

    if (!user?.participante_id) return;

    if (user.participante_id !== organizationId) {

      response.status(403).json({ error: "Esta cadeia pertence a outra organização" });

      return;

    }

    const workflow = await loadWorkflow(organizationId);

    if (!workflow) return notFound(response);

    response.json(workflow);

  } catch (error) {

    chainFailure(response, error);

  }

});



app.post("/api/workflows/:workflowId/participants", async (request, response) => {

  const parsed = participantSchema.safeParse(request.body);

  if (!parsed.success) {

    response.status(400).json({ error: "Dados do participante inválidos", details: parsed.error.issues });

    return;

  }



  try {

    const user = await loadWorkflowAdministrator(request, response);

    if (!user?.participante_id) return;

    const organizationId = parseChainId(request.params.workflowId);

    if (organizationId === undefined || organizationId !== user.participante_id) {

      response.status(403).json({ error: "Esta cadeia pertence a outra organização" });

      return;

    }

    const workflow = await loadWorkflow(organizationId);

    if (!workflow) return notFound(response);

    if (!workflow.steps.some((step) =>

      step.assignee.toLowerCase() === parsed.data.address.toLowerCase() &&

      step.requiredRole === parsed.data.role

    )) {

      response.status(400).json({ error: "O participante não está atribuído a nenhuma etapa desta cadeia" });

      return;

    }

    const currentRole = await getParticipantRole(workflow.workflowAddress, parsed.data.address);

    if (currentRole !== "none" && currentRole !== parsed.data.role) {

      response.status(409).json({ error: "A carteira já está registrada com outro papel" });

      return;

    }

    if (currentRole === "none") {

      await registerParticipant(workflow.workflowAddress, parsed.data.address, parsed.data.role);

    }

    if (!workflow.participants.some((item) => item.address.toLowerCase() === parsed.data.address.toLowerCase())) {

      workflow.participants.push(parsed.data);

    }

    response.status(currentRole === "none" ? 201 : 200).json(parsed.data);

  } catch (error) {

    chainFailure(response, error);

  }

});



app.delete("/api/workflows/:workflowId/participants/:address", async (request, response) => {

  let address: string;

  try {

    address = assertAddress(request.params.address, "participant");

  } catch {

    response.status(400).json({ error: "Endereço do participante inválido" });

    return;

  }



  try {

    const user = await loadWorkflowAdministrator(request, response);

    if (!user?.participante_id) return;

    const organizationId = parseChainId(request.params.workflowId);

    if (organizationId === undefined || organizationId !== user.participante_id) {

      response.status(403).json({ error: "Esta cadeia pertence a outra organização" });

      return;

    }

    const workflow = await loadWorkflow(organizationId);

    if (!workflow) return notFound(response);

    if (workflow.steps.some((step) => step.assignee.toLowerCase() === address.toLowerCase())) {

      response.status(409).json({ error: "Não é possível revogar a carteira atribuída a uma etapa ativa" });

      return;

    }

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

  let workflow: StoredWorkflow | undefined;

  try {

    workflow = await loadWorkflow(parsed.data.workflowId);

  } catch (error) {

    chainFailure(response, error);

    return;

  }

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

    if (parsed.data.currentCustodian.toLowerCase() !== workflow.steps[0].assignee.toLowerCase()) {

      response.status(409).json({ error: "O custodiante inicial não está atribuído à primeira etapa" });

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



  const workflow = await loadWorkflow(batch.workflowId);

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

    if (parsed.data.to.toLowerCase() !== workflow.steps[batch.currentStepIndex + 1].assignee.toLowerCase()) {

      response.status(409).json({ error: "O destinatário não está atribuído à próxima etapa" });

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

app.get("/api/blockchain/history", async (_request, response) => {
  try {
    const [movements, workflows, movementCount, workflowCount] = await Promise.all([
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
      prisma.cadeia_custodia.findMany({
        where: { tx_hash_criacao: { not: null } },
        orderBy: [{ data_criacao: "desc" }, { id: "desc" }],
        take: 100,
        include: { organizacao: true },
      }),
      prisma.movimentacao.count({ where: { tx_hash: { not: null } } }),
      prisma.cadeia_custodia.count({ where: { tx_hash_criacao: { not: null } } }),
    ]);

    const indexedTransactions = [
      ...movements.flatMap((movement) => movement.tx_hash
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
        : []),
      ...workflows.flatMap((workflow) => workflow.tx_hash_criacao
        ? [{
          hash: workflow.tx_hash_criacao,
          event: "Criação de cadeia",
          item: workflow.nome,
          party: workflow.organizacao.nome,
          from: undefined,
          to: workflow.endereco_contrato,
          date: workflow.data_criacao.toISOString(),
          location: undefined,
        }]
        : []),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);

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
        totalTransactions: movementCount + workflowCount,
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
