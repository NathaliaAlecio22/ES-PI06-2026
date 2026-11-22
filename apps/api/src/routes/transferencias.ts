import { Prisma } from "@prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import {
  buildDataHash,
  buildTransferDigest,
  createBatch,
  deriveLotBatchId,
  getBatchState,
  getParticipantRole,
  getWorkflowForOrganization,
  getWorkflowSteps,
  isWorkflowFactoryVersionError,
  recoverTransferSigner,
  revertReasonOf,
  transferCustody,
} from "../blockchain";
import { env } from "../config/env";
import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser, roleFromProfile } from "../utils/session";

const router = Router();

const STATUS = {
  PENDING: "AGUARDANDO_CONFIRMACAO",
  CONFIRMED: "CONFIRMADA",
  ISSUE: "COM_OCORRENCIA",
} as const;

const statusLabels: Record<string, string> = {
  AGUARDANDO_CONFIRMACAO: "Aguardando confirmação",
  CONFIRMADA: "Confirmada",
  COM_OCORRENCIA: "Com ocorrência",
};

const storageLabels: Record<string, string> = {
  EM_TRANSPORTE: "Em transporte",
  ARMAZENADO: "Armazenado",
  ATIVO: "Armazenado",
  PENDENTE: "Pendente",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function handleError(
  error: unknown,
  response: Response,
  fallback: string,
) {
  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }

  const reason = revertReasonOf(error);
  if (reason) {
    response.status(409).json({ message: `A blockchain rejeitou a transferência: ${reason}` });
    return;
  }

  console.error(fallback, error);
  response.status(500).json({ message: fallback });
}

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const createSchema = z.object({
  lot: z.string().trim().min(1).max(100),
  destinationId: z.string().regex(/^\d+$/, "Destino inválido."),
  location: z.string().trim().min(1).max(200),
  temperature: optionalNumber,
  humidity: optionalNumber.refine(
    (value) =>
      value === undefined || (value >= 0 && value <= 100),
    "A umidade deve estar entre 0 e 100%.",
  ),
  notes: z.string().trim().max(2_000).optional(),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/).optional(),
});

const issueSchema = z.object({
  notes: z.string().trim().min(3).max(2_000),
});

const include = {
  lote: { include: { produto: true } },
  participante_movimentacao_origem_idToparticipante: true,
  participante_movimentacao_destino_idToparticipante: true,
} satisfies Prisma.movimentacaoInclude;

type TransferRow = Prisma.movimentacaoGetPayload<{
  include: typeof include;
}>;

const zone = "America/Sao_Paulo";

function toTransfer(row: TransferRow, participantId: bigint) {
  const when = row.data_movimentacao ?? new Date();
  const year = when.getFullYear();
  const unit = row.lote.unidade_medida ?? "";

  return {
    id: `TRF-${year}-${String(row.id).padStart(4, "0")}`,
    rawId: row.id.toString(),
    product: row.lote.produto.nome,
    lot: row.lote.codigo,

    previousOwner:
      row.participante_movimentacao_origem_idToparticipante?.nome ?? "—",

    newOwner:
      row.participante_movimentacao_destino_idToparticipante.nome,

    date: when.toLocaleDateString("pt-BR", {
      timeZone: zone,
    }),

    time: when.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone,
    }),

    status: statusLabels[row.status] ?? row.status,

    storageStatus:
      storageLabels[row.lote.status] ?? "Pendente",

    hash: row.tx_hash ?? "Pendente",
    location: row.localizacao ?? "",

    quantity: row.quantidade
      ? `${row.quantidade.toString()} ${unit}`.trim()
      : "",

    temperature: row.temperatura?.toString(),
    humidity: row.umidade?.toString(),
    notes: row.observacoes ?? undefined,

    canRespond:
      row.destino_id === participantId &&
      row.status === STATUS.PENDING,
  };
}

function paramId(raw: string | string[] | undefined): bigint {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "Transferência inválida.");
  }
  return BigInt(value);
}

type ChainTransferContext = {
  workflowAddress: string;
  batchId: bigint;
  signer: string;
  recipient: string;
  stepIndex: number;
  deliverableHash: string;
  digest: string;
  custodyStageId: bigint | null;
};

async function chainTransferContext(input: {
  lotCode: string;
  destinationId: bigint;
  participantId: bigint;
  location: string;
  temperature?: number;
  humidity?: number;
}): Promise<ChainTransferContext | null> {
  const lot = await prisma.lote.findUnique({
    where: { codigo: input.lotCode },
    include: { produto: true },
  });
  if (!lot) throw new HttpError(404, "Lote não encontrado.");
  if (lot.responsavel_atual_id !== input.participantId) {
    throw new HttpError(403, "Seu lote não está sob a custódia da sua organização.");
  }

  const savedWorkflow = lot.produto.fabricante_id
    ? await prisma.cadeia_custodia.findUnique({
      where: { organizacao_id: lot.produto.fabricante_id },
      include: { etapas: { orderBy: { ordem: "asc" } } },
    })
    : null;
  const workflowAddress = savedWorkflow?.endereco_contrato ?? (lot.produto.fabricante_id
    ? await getWorkflowForOrganization(lot.produto.fabricante_id).catch((error: unknown) => {
      if (isWorkflowFactoryVersionError(error)) return null;
      throw error;
    })
    : null);
  if (!workflowAddress) return null;

  const [steps, source] = await Promise.all([
    getWorkflowSteps(workflowAddress),
    prisma.participante.findUnique({
      where: { id: input.participantId },
      select: { wallet_address: true },
    }),
  ]);
  if (!source?.wallet_address) {
    throw new HttpError(409, "Cadastre a carteira da sua organização para transferir este lote.");
  }

  const batchId = await deriveLotBatchId(input.lotCode);
  let state = await getBatchState(workflowAddress, batchId);
  if (state.currentCustodian === "0x0000000000000000000000000000000000000000") {
    if (source.wallet_address.toLowerCase() !== steps[0]?.assignee.toLowerCase()) {
      throw new HttpError(409, "Este lote ainda não foi iniciado na primeira etapa da cadeia.");
    }
    await createBatch(workflowAddress, batchId, source.wallet_address);
    state = await getBatchState(workflowAddress, batchId);
  }
  if (state.status !== "ACTIVE") {
    throw new HttpError(409, "Este lote está comprometido e não aceita transferências.");
  }
  if (state.currentCustodian.toLowerCase() !== source.wallet_address.toLowerCase()) {
    throw new HttpError(409, "A carteira da sua organização não corresponde ao custodiante atual da blockchain.");
  }
  const currentStep = steps[state.currentStepIndex];
  const nextStep = steps[state.currentStepIndex + 1];
  if (!currentStep || !nextStep) {
    throw new HttpError(409, "O lote já concluiu a etapa final da cadeia.");
  }
  if (currentStep.assignee.toLowerCase() !== source.wallet_address.toLowerCase()) {
    throw new HttpError(403, "Sua organização não está atribuída à etapa atual.");
  }

  const currentSavedStage = savedWorkflow?.etapas.find((stage) => stage.ordem === state.currentStepIndex);
  if (currentSavedStage?.responsavel_id && currentSavedStage.responsavel_id !== input.participantId) {
    throw new HttpError(403, "Sua organização não é a responsável cadastrada para a etapa atual.");
  }

  const [destination, registeredRole, nextRegisteredRole] = await Promise.all([
    prisma.participante.findUnique({
      where: { id: input.destinationId },
      select: { wallet_address: true, ativo: true },
    }),
    getParticipantRole(workflowAddress, source.wallet_address),
    getParticipantRole(workflowAddress, nextStep.assignee),
  ]);
  if (!destination?.ativo || !destination.wallet_address) {
    throw new HttpError(400, "Destino inválido ou sem carteira cadastrada.");
  }
  if (destination.wallet_address.toLowerCase() !== nextStep.assignee.toLowerCase()) {
    throw new HttpError(409, "O destino não é o responsável definido para a próxima etapa.");
  }
  const nextSavedStage = savedWorkflow?.etapas.find((stage) => stage.ordem === state.currentStepIndex + 1);
  if (nextSavedStage?.responsavel_id && nextSavedStage.responsavel_id !== input.destinationId) {
    throw new HttpError(409, "O participante selecionado não corresponde ao responsável salvo para a próxima etapa.");
  }
  if (registeredRole !== currentStep.requiredRole) {
    throw new HttpError(403, "A carteira não possui o papel exigido para a etapa atual.");
  }
  if (nextRegisteredRole !== nextStep.requiredRole) {
    throw new HttpError(409, "A carteira da próxima etapa ainda não está autorizada na blockchain. O administrador deve sincronizar os responsáveis da cadeia.");
  }

  const conditionReferences = [
    ...(input.temperature == null ? [] : [`temperature:${input.temperature}`]),
    ...(input.humidity == null ? [] : [`humidity:${input.humidity}`]),
  ];
  const dataHash = buildDataHash({ locationReference: input.location, conditionReferences });
  const digest = buildTransferDigest({
    workflowAddress,
    chainId: env.CHAIN_ID,
    batchId,
    to: destination.wallet_address,
    deliverableHash: currentStep.specificationHash,
    dataHash,
  });
  return {
    workflowAddress,
    batchId,
    signer: source.wallet_address,
    recipient: destination.wallet_address,
    stepIndex: state.currentStepIndex,
    deliverableHash: currentStep.specificationHash,
    digest,
    custodyStageId: nextSavedStage?.id ?? null,
  };
}

// ======================================================
// OPÇÕES PARA O FORMULÁRIO
// Retorna lotes disponíveis e participantes ativos.
// ======================================================

router.get("/opcoes", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    const [lots, participants] = await Promise.all([
      prisma.lote.findMany({
        where: {
          responsavel_atual_id: participantId,
          status: {
            in: ["ATIVO", "ARMAZENADO"],
          },
          movimentacao: {
            none: {
              tipo: "TRANSFERENCIA",
              status: STATUS.PENDING,
            },
          },
        },
        include: {
          produto: true,
        },
        orderBy: {
          id: "desc",
        },
      }),

      prisma.participante.findMany({
        where: {
          ativo: true,
          id: {
            not: participantId,
          },
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          wallet_address: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),
    ]);

    const lotsWithNextStage = await Promise.all(lots.map(async (lot) => {
      const savedWorkflow = lot.produto.fabricante_id
        ? await prisma.cadeia_custodia.findUnique({
          where: { organizacao_id: lot.produto.fabricante_id },
          select: { endereco_contrato: true },
        })
        : null;
      const workflowAddress = savedWorkflow?.endereco_contrato ?? (env.WORKFLOW_FACTORY_ADDRESS && lot.produto.fabricante_id
        ? await getWorkflowForOrganization(lot.produto.fabricante_id).catch((error: unknown) => {
          if (isWorkflowFactoryVersionError(error)) return null;
          throw error;
        })
        : null);
      if (!workflowAddress) {
        return { lot, nextDestinationId: null, workflowManaged: false, workflowComplete: false };
      }
      const steps = await getWorkflowSteps(workflowAddress);
      const batchId = await deriveLotBatchId(lot.codigo);
      const state = await getBatchState(workflowAddress, batchId);
      const nextAssignee = steps[state.currentStepIndex + 1]?.assignee;
      const nextParticipant = nextAssignee
        ? participants.find((participant) =>
          participant.wallet_address?.toLowerCase() === nextAssignee.toLowerCase(),
        )
        : undefined;
      return {
        lot,
        nextDestinationId: nextParticipant?.id.toString() ?? null,
        workflowManaged: true,
        workflowComplete: !nextAssignee,
      };
    }));

    response.json({
      lots: lotsWithNextStage.map(({ lot, nextDestinationId, workflowManaged, workflowComplete }) => ({
        id: lot.id.toString(),
        code: lot.codigo,
        product: lot.produto.nome,
        quantity: lot.quantidade?.toString() ?? "",
        unit: lot.unidade_medida ?? "",
        currentOwner: user.participante?.nome ?? "",
        location: lot.localizacao_origem ?? "",
        nextDestinationId,
        workflowManaged,
        workflowComplete,
      })),

      participants: participants.map((participant) => ({
        id: participant.id.toString(),
        name: participant.nome,
        type: participant.tipo,
      })),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível carregar as opções de transferência.",
    );
  }
});

router.post("/assinatura", autenticar, async (request, response) => {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Confira os dados da transferência." });
    return;
  }
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;
    if (roleFromProfile(user.perfil) === "VIEWER") {
      response.status(403).json({ message: "Seu perfil não permite criar transferências." });
      return;
    }

    const context = await chainTransferContext({
      lotCode: parsed.data.lot,
      destinationId: BigInt(parsed.data.destinationId),
      participantId: user.participante_id,
      location: parsed.data.location,
      temperature: parsed.data.temperature,
      humidity: parsed.data.humidity,
    });
    if (!context) {
      response.json({ blockchainRequired: false });
      return;
    }
    response.json({
      blockchainRequired: true,
      digest: context.digest,
      signer: context.signer,
      recipient: context.recipient,
      stepIndex: context.stepIndex,
    });
  } catch (error) {
    handleError(error, response, "Não foi possível preparar a assinatura da transferência.");
  }
});

// ======================================================
// LISTAGEM
// ======================================================

router.get("/", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    const rows = await prisma.movimentacao.findMany({
      where: {
        tipo: "TRANSFERENCIA",
        OR: [
          { origem_id: participantId },
          { destino_id: participantId },
        ],
      },
      include,
      orderBy: {
        id: "desc",
      },
    });

    response.json({
      transfers: rows.map((row) =>
        toTransfer(row, participantId),
      ),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível carregar as transferências.",
    );
  }
});

// ======================================================
// INDICADORES
// ======================================================

router.get("/stats", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    const rows = await prisma.movimentacao.findMany({
      where: {
        tipo: "TRANSFERENCIA",
        OR: [
          { origem_id: participantId },
          { destino_id: participantId },
        ],
      },
      select: {
        status: true,
      },
    });

    response.json({
      total: rows.length,

      pending: rows.filter(
        (row) => row.status === STATUS.PENDING,
      ).length,

      confirmed: rows.filter(
        (row) => row.status === STATUS.CONFIRMED,
      ).length,

      withIssue: rows.filter(
        (row) => row.status === STATUS.ISSUE,
      ).length,
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível carregar os indicadores.",
    );
  }
});

// ======================================================
// CRIAR TRANSFERÊNCIA
// A custódia ainda permanece com a origem.
// ======================================================

router.post("/", autenticar, async (request, response) => {
  const parsed = createSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      message: "Confira os dados da transferência.",

      errors: parsed.error.issues.map(({ path, message }) => ({
        field: path.join("."),
        message,
      })),
    });

    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    if (roleFromProfile(user.perfil) === "VIEWER") {
      response.status(403).json({
        message: "Seu perfil não permite criar transferências.",
      });

      return;
    }

    const input = parsed.data;
    const destinationId = BigInt(input.destinationId);

    if (destinationId === participantId) {
      response.status(400).json({
        message: "O destino deve ser diferente da sua organização.",
      });

      return;
    }

    const chainContext = await chainTransferContext({
      lotCode: input.lot,
      destinationId,
      participantId,
      location: input.location,
      temperature: input.temperature,
      humidity: input.humidity,
    });
    if (chainContext) {
      if (!input.signature) {
        response.status(400).json({ message: "A carteira da etapa atual precisa assinar esta transferência." });
        return;
      }
      let signer: string;
      try {
        signer = recoverTransferSigner(chainContext.digest, input.signature);
      } catch {
        response.status(401).json({ message: "Assinatura da carteira inválida." });
        return;
      }
      if (signer.toLowerCase() !== chainContext.signer.toLowerCase()) {
        response.status(401).json({ message: "A assinatura deve vir da carteira responsável pela etapa atual." });
        return;
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const lot = await tx.lote.findUnique({
        where: {
          codigo: input.lot,
        },
      });

      if (!lot) {
        throw new HttpError(404, "Lote não encontrado.");
      }

      if (lot.responsavel_atual_id !== participantId) {
        throw new HttpError(
          403,
          "Seu lote não está sob a custódia da sua organização.",
        );
      }

      if (!["ATIVO", "ARMAZENADO"].includes(lot.status)) {
        throw new HttpError(
          409,
          "Este lote não está disponível para transferência.",
        );
      }

      const pendingMovement = await tx.movimentacao.findFirst({
        where: {
          lote_id: lot.id,
          tipo: "TRANSFERENCIA",
          status: STATUS.PENDING,
        },
        select: {
          id: true,
        },
      });

      if (pendingMovement) {
        throw new HttpError(
          409,
          "Este lote já possui uma transferência em andamento.",
        );
      }

      const destination = await tx.participante.findUnique({
        where: {
          id: destinationId,
        },
      });

      if (!destination || destination.ativo !== true) {
        throw new HttpError(
          400,
          "Destino inválido ou inativo.",
        );
      }

      // Reserva o lote de forma atômica.
      // Impede duas saídas simultâneas do mesmo lote.

      const claimed = await tx.lote.updateMany({
        where: {
          id: lot.id,
          responsavel_atual_id: participantId,
          status: {
            in: ["ATIVO", "ARMAZENADO"],
          },
        },
        data: {
          status: "EM_TRANSPORTE",
        },
      });

      if (claimed.count !== 1) {
        throw new HttpError(
          409,
          "Este lote já possui uma transferência em andamento.",
        );
      }

      const chainResult = chainContext
        ? await transferCustody(chainContext.workflowAddress, {
          batchId: chainContext.batchId,
          to: chainContext.recipient,
          deliverableHash: chainContext.deliverableHash,
          dataHash: buildDataHash({
            locationReference: input.location,
            conditionReferences: [
              ...(input.temperature == null ? [] : [`temperature:${input.temperature}`]),
              ...(input.humidity == null ? [] : [`humidity:${input.humidity}`]),
            ],
          }),
          signature: input.signature ?? "",
        })
        : undefined;

      const movement = await tx.movimentacao.create({
        data: {
          lote_id: lot.id,
          origem_id: participantId,
          destino_id: destinationId,
          usuario_id: user.id,
          tipo: "TRANSFERENCIA",
          status: chainContext ? STATUS.CONFIRMED : STATUS.PENDING,
          confirmado_em: chainContext ? new Date() : null,
          tx_hash: chainResult?.txHash ?? null,
          status_blockchain: chainContext ? "CONFIRMADA" : "PENDENTE",
          localizacao: input.location,
          quantidade: lot.quantidade,

          temperatura:
            input.temperature != null
              ? new Prisma.Decimal(input.temperature)
              : null,

          umidade:
            input.humidity != null
              ? new Prisma.Decimal(input.humidity)
              : null,

          observacoes: input.notes || null,
          etapa_cadeia_id: chainContext?.custodyStageId ?? null,
        },
        include,
      });

      if (chainContext) {
        await tx.lote.update({
          where: { id: lot.id },
          data: {
            responsavel_atual_id: destinationId,
            status: "ARMAZENADO",
          },
        });
      }

      // Histórico de condições do lote.
      if (
        input.temperature != null ||
        input.humidity != null
      ) {
        await tx.registro_condicao.create({
          data: {
            lote_id: lot.id,

            temperatura:
              input.temperature != null
                ? new Prisma.Decimal(input.temperature)
                : null,

            umidade:
              input.humidity != null
                ? new Prisma.Decimal(input.humidity)
                : null,

            localizacao: input.location,
          },
        });
      }

      return chainContext
        ? tx.movimentacao.findUniqueOrThrow({ where: { id: movement.id }, include })
        : movement;
    });

    response.status(201).json({
      transfer: toTransfer(created, participantId),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível criar a transferência.",
    );
  }
});

// ======================================================
// CONFIRMAR RECEBIMENTO
// Somente o destino pode confirmar.
// Aqui a custódia muda.
// ======================================================

router.post("/:id/confirmar", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    if (roleFromProfile(user.perfil) === "VIEWER") {
      response.status(403).json({
        message: "Seu perfil não permite confirmar recebimentos.",
      });

      return;
    }

    const id = paramId(request.params.id);

    const updated = await prisma.$transaction(async (tx) => {
      const movement = await tx.movimentacao.findFirst({
        where: {
          id,
          destino_id: participantId,
          tipo: "TRANSFERENCIA",
          status: STATUS.PENDING,
        },
      });

      if (!movement) {
        throw new HttpError(
          404,
          "Transferência pendente não encontrada para a sua organização.",
        );
      }

      const claimed = await tx.movimentacao.updateMany({
        where: {
          id,
          destino_id: participantId,
          status: STATUS.PENDING,
        },
        data: {
          status: STATUS.CONFIRMED,
          confirmado_em: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new HttpError(
          409,
          "Esta transferência já foi processada.",
        );
      }

      await tx.lote.update({
        where: {
          id: movement.lote_id,
        },
        data: {
          responsavel_atual_id: participantId,
          status: "ARMAZENADO",
        },
      });

      return tx.movimentacao.findUniqueOrThrow({
        where: {
          id,
        },
        include,
      });
    });

    response.json({
      transfer: toTransfer(updated, participantId),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível confirmar a transferência.",
    );
  }
});

// ======================================================
// REGISTRAR OCORRÊNCIA
// A custódia permanece com a origem.
// ======================================================

router.post("/:id/ocorrencia", autenticar, async (request, response) => {
  const parsed = issueSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      message: "Descreva a ocorrência (mínimo 3 caracteres).",
    });

    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participantId = user.participante_id;

    if (roleFromProfile(user.perfil) === "VIEWER") {
      response.status(403).json({
        message: "Seu perfil não permite registrar ocorrências.",
      });

      return;
    }

    const id = paramId(request.params.id);

    const updated = await prisma.$transaction(async (tx) => {
      const movement = await tx.movimentacao.findFirst({
        where: {
          id,
          destino_id: participantId,
          tipo: "TRANSFERENCIA",
          status: STATUS.PENDING,
        },
      });

      if (!movement) {
        throw new HttpError(
          404,
          "Transferência pendente não encontrada para a sua organização.",
        );
      }

      const claimed = await tx.movimentacao.updateMany({
        where: {
          id,
          destino_id: participantId,
          status: STATUS.PENDING,
        },
        data: {
          status: STATUS.ISSUE,

          observacoes: movement.observacoes
            ? `${movement.observacoes}\n\nOcorrência: ${parsed.data.notes}`
            : `Ocorrência: ${parsed.data.notes}`,
        },
      });

      if (claimed.count !== 1) {
        throw new HttpError(
          409,
          "Esta transferência já foi processada.",
        );
      }

      // O responsável atual não muda.
      // O lote continua com a origem.

      await tx.lote.update({
        where: {
          id: movement.lote_id,
        },
        data: {
          status: "ARMAZENADO",
        },
      });

      return tx.movimentacao.findUniqueOrThrow({
        where: {
          id,
        },
        include,
      });
    });

    response.json({
      transfer: toTransfer(updated, participantId),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível registrar a ocorrência.",
    );
  }
});

export default router;