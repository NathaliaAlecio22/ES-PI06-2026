import { Prisma } from "@prisma/client";
import { ethers } from "ethers";
import { Router, type Response } from "express";

import {
  createTransferRequestSchema,
  reportIssueRequestSchema,
} from "@provenance/shared";

import {
  buildDataHash,
  buildTransferDigest,
  revertReasonOf,
  transferCustody,
} from "../blockchain";
import {
  deliverableHashForTransfer,
  orgSignerKey,
  reportConditions,
} from "../chain/org-chain";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
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
  COM_OCORRENCIA: "Com ocorrência",
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

  console.error(fallback, error);
  response.status(500).json({ message: fallback });
}

/**
 * Replies for a failed chain operation (same classification as `chainFailure` in app.ts):
 * a rejection by the contract itself is a client-fixable 409 carrying the decoded reason;
 * anything else (RPC down, missing configuration) is a 502.
 */
function chainTransferFailure(response: Response, error: unknown): void {
  const revertReason = revertReasonOf(error);
  if (revertReason !== undefined) {
    response.status(409).json({ message: `A blockchain rejeitou a operação: ${revertReason}` });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  response.status(502).json({ message: `Erro de comunicação com a blockchain: ${message}` });
}

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

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The step a lot moves into next, read from the single custody chain of the organization
 * that registered the product (the chain `createBatch` was called on — see produtos.ts).
 * Every step carries the participant the admin assigned to it at chain creation; a lot
 * may only be handed to that participant.
 */
async function findNextChainStep(
  db: Db,
  organizationId: bigint | null,
  currentStepIndex: number,
) {
  if (organizationId == null) return null;
  return db.etapa_cadeia_custodia.findFirst({
    where: {
      ordem: currentStepIndex + 1,
      cadeia: { organizacao_id: organizationId },
    },
    include: { cadeia: true, responsavel: true },
  });
}

function paramId(raw: string | string[] | undefined): bigint {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "Transferência inválida.");
  }

  return BigInt(value);
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

    const lots = await prisma.lote.findMany({
        where: {
          responsavel_atual_id: participantId,
          status: {
            in: ["ATIVO", "ARMAZENADO"],
          },
          chain_batch_id: { not: null },
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
      });

    // Each lot's next step lives on the chain of the organization that registered its
    // product. Only lots whose next step has an active assignee are offered, and each lot
    // carries that assignee: it is the only valid destination (checked again on creation).
    const organizationIds = [
      ...new Set(lots.flatMap((lot) => (lot.produto.fabricante_id != null ? [lot.produto.fabricante_id] : []))),
    ];
    const chains = await prisma.cadeia_custodia.findMany({
      where: { organizacao_id: { in: organizationIds } },
      include: { etapas: { include: { responsavel: true } } },
    });
    const chainByOrganization = new Map(chains.map((chain) => [chain.organizacao_id, chain]));

    const destinations = new Map<string, { id: string; name: string; type: string | null }>();
    const availableLots = lots.flatMap((lot) => {
      const chain = lot.produto.fabricante_id != null
        ? chainByOrganization.get(lot.produto.fabricante_id)
        : undefined;
      const nextStep = chain?.etapas.find((step) => step.ordem === lot.current_step_index + 1);
      const assignee = nextStep?.responsavel;
      if (!nextStep || !assignee || assignee.ativo !== true || assignee.id === participantId) {
        return [];
      }
      destinations.set(assignee.id.toString(), {
        id: assignee.id.toString(),
        name: assignee.nome,
        type: assignee.tipo,
      });
      return [{
        id: lot.id.toString(),
        code: lot.codigo,
        product: lot.produto.nome,
        quantity: lot.quantidade?.toString() ?? "",
        unit: lot.unidade_medida ?? "",
        currentOwner: user.participante?.nome ?? "",
        location: lot.localizacao_origem ?? "",
        nextRole: nextStep.papel,
        nextStep: nextStep.nome,
        nextParticipantId: assignee.id.toString(),
      }];
    });

    response.json({
      lots: availableLots,
      participants: [...destinations.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    handleError(
      error,
      response,
      "Não foi possível carregar as opções de transferência.",
    );
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
  const parsed = createTransferRequestSchema.safeParse(request.body);

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

    const created = await prisma.$transaction(async (tx) => {
      const lot = await tx.lote.findUnique({
        where: {
          codigo: input.lot,
        },
        include: {
          produto: true,
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

      if (!lot.chain_batch_id) {
        throw new HttpError(409, "Este lote ainda não foi registrado na blockchain.");
      }

      const nextStep = await findNextChainStep(
        tx,
        lot.produto.fabricante_id,
        lot.current_step_index,
      );
      if (!nextStep) {
        throw new HttpError(409, "Este lote já concluiu a cadeia de custódia.");
      }
      if (nextStep.responsavel_id !== destinationId) {
        throw new HttpError(
          409,
          "O destino não é o responsável pela próxima etapa da cadeia de custódia.",
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

      const movement = await tx.movimentacao.create({
        data: {
          lote_id: lot.id,
          origem_id: participantId,
          destino_id: destinationId,
          usuario_id: user.id,
          tipo: "TRANSFERENCIA",
          status: STATUS.PENDING,
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
        },
        include,
      });

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

      return movement;
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

const confirmInclude = {
  lote: { include: { produto: true } },
  participante_movimentacao_origem_idToparticipante: true,
  participante_movimentacao_destino_idToparticipante: true,
} satisfies Prisma.movimentacaoInclude;

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

    const movement = await prisma.movimentacao.findFirst({
      where: {
        id,
        destino_id: participantId,
        tipo: "TRANSFERENCIA",
        status: STATUS.PENDING,
      },
      include: confirmInclude,
    });

    if (!movement) {
      response.status(404).json({
        message: "Transferência pendente não encontrada para a sua organização.",
      });
      return;
    }

    const lot = movement.lote;
    const origin = movement.participante_movimentacao_origem_idToparticipante;
    const destination = movement.participante_movimentacao_destino_idToparticipante;

    if (!lot.chain_batch_id) {
      response.status(409).json({ message: "Este lote não possui registro on-chain." });
      return;
    }
    if (!origin?.wallet_address || !destination.wallet_address) {
      response.status(502).json({
        message: "Dados on-chain incompletos para esta transferência.",
      });
      return;
    }

    const nextStep = await findNextChainStep(
      prisma,
      lot.produto.fabricante_id,
      lot.current_step_index,
    );
    if (!nextStep) {
      response.status(409).json({ message: "Este lote já concluiu a cadeia de custódia." });
      return;
    }
    // The assignee was registered on the contract at chain creation (organizacao.ts), under
    // the wallet snapshotted in the step; no lazy registration happens here.
    if (
      nextStep.responsavel_id !== participantId ||
      nextStep.endereco_carteira.toLowerCase() !== destination.wallet_address.toLowerCase()
    ) {
      response.status(409).json({
        message: "Sua organização não é a responsável pela próxima etapa da cadeia de custódia.",
      });
      return;
    }

    const workflowAddress = nextStep.cadeia.endereco_contrato;
    const originSignerKey = orgSignerKey(origin.wallet_address);

    try {
      const deliverableHash = deliverableHashForTransfer({
        lot: lot.codigo,
        product: lot.produto.nome,
        quantity: movement.quantidade?.toString() ?? null,
        unit: lot.unidade_medida,
        location: movement.localizacao,
        notes: movement.observacoes,
        temperature: movement.temperatura?.toString() ?? null,
        humidity: movement.umidade?.toString() ?? null,
      });
      const dataHash = buildDataHash({
        locationReference: movement.localizacao ?? undefined,
        conditionReferences: [],
      });
      const batchId = BigInt(lot.chain_batch_id);
      const digest = buildTransferDigest({
        workflowAddress,
        chainId: env.CHAIN_ID,
        batchId,
        to: destination.wallet_address,
        deliverableHash,
        dataHash,
      });
      // Custodial signing model: the API holds the current custodian's key, so it signs
      // the transfer digest on the origin organization's behalf (docs/poc-checklist.md).
      const signature = await new ethers.Wallet(originSignerKey).signMessage(
        ethers.getBytes(digest),
      );

      const result = await transferCustody(
        workflowAddress,
        { batchId, to: destination.wallet_address, deliverableHash, dataHash, signature },
        originSignerKey,
      );

      let loteStatus = "ARMAZENADO";
      if (movement.temperatura != null || movement.umidade != null) {
        const reported = await reportConditions({
          workflowAddress,
          batchId,
          signerKey: originSignerKey,
          temperature: movement.temperatura != null ? movement.temperatura.toNumber() : null,
          humidity: movement.umidade != null ? movement.umidade.toNumber() : null,
        });
        if (reported.some((reading) => reading.breached)) {
          loteStatus = "COM_OCORRENCIA";
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.movimentacao.update({
          where: { id },
          data: {
            status: STATUS.CONFIRMED,
            confirmado_em: new Date(),
            tx_hash: result.txHash,
            status_blockchain: "CONFIRMADA",
          },
        });

        await tx.lote.update({
          where: { id: lot.id },
          data: {
            responsavel_atual_id: participantId,
            status: loteStatus,
            current_step_index: result.event.stepIndex,
          },
        });

        return tx.movimentacao.findUniqueOrThrow({ where: { id }, include });
      });

      response.json({
        transfer: toTransfer(updated, participantId),
      });
    } catch (error) {
      // Chain failure after the pre-checks above: the DB row stays in its pre-chain
      // state (accepted inline-mirror trade-off, documented).
      chainTransferFailure(response, error);
    }
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
  const parsed = reportIssueRequestSchema.safeParse(request.body);

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