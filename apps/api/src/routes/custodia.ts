import { Prisma } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../lib/prisma";
import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser } from "../utils/session";

const router = Router();

const TIME_ZONE = "America/Sao_Paulo";

type StepState = "done" | "current" | "pending" | "issue";

export type CustodyStepDto = {
  id: string;
  stageName?: string;
  state: StepState;
  org: string;
  role: string;
  person: string;
  location: string;
  date: string;
  type: string;
  /** Hash da transação na blockchain; null enquanto não houver registro on-chain. */
  hash: string | null;
};

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC", // colunas @db.Date são gravadas à meia-noite UTC
});

function parts(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

/** "18 mai 2025 • 08:42" */
function formatDateTime(date: Date): string {
  const p = parts(dateTimeFormat, date);
  return `${p.day} ${p.month.replace(".", "")} ${p.year} • ${p.hour}:${p.minute}`;
}

/** "18 mai 2025" */
function formatDate(date: Date): string {
  const p = parts(dateFormat, date);
  return `${p.day} ${p.month.replace(".", "")} ${p.year}`;
}

const roleDescriptions: Record<string, string> = {
  Fabricante: "Produção e registro de origem",
  manufacturer: "Produção e registro de origem",
  Transportadora: "Transporte",
  carrier: "Transporte",
  Distribuidor: "Distribuição",
  distributor: "Distribuição",
  "Centro de armazenamento": "Recebimento e armazenagem",
  distribution_center: "Recebimento e armazenagem",
  Varejista: "Venda ao consumidor",
  retailer: "Venda ao consumidor",
};

function describeRole(tipo: string | null | undefined): string {
  if (!tipo) return "Participante da cadeia";
  return roleDescriptions[tipo] ?? tipo;
}

function statusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "EM_TRANSPORTE":
      return "Em transporte";
    case "ARMAZENADO":
    case "ATIVO":
      return "Armazenado";
    case "ENTREGUE":
      return "Entregue";
    default:
      return "Pendente";
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Um lote é visível para a organização que o fabricou, que o tem hoje sob custódia ou que
 * participou de alguma transferência dele (como origem ou destino).
 */
function visibleTo(participantId: bigint): Prisma.loteWhereInput {
  return {
    OR: [
      { responsavel_atual_id: participantId },
      { produto: { fabricante_id: participantId } },
      {
        movimentacao: {
          some: { OR: [{ origem_id: participantId }, { destino_id: participantId }] },
        },
      },
      // A organização também pode acompanhar um lote quando está designada para
      // uma etapa futura da cadeia, antes mesmo de receber a custódia.
      {
        produto: {
          fabricante: {
            is: {
              cadeias_custodia: {
                some: { etapas: { some: { responsavel_id: participantId } } },
              },
            },
          },
        },
      },
    ],
  };
}

const detailInclude = {
  produto: { include: { fabricante: true } },
  participante: true,
  usuario_cadastro: true,
  movimentacao: {
    where: { tipo: "TRANSFERENCIA" },
    orderBy: { id: "asc" },
    include: {
      usuario: true,
      participante_movimentacao_destino_idToparticipante: true,
      etapa_cadeia: true,
    },
  },
} satisfies Prisma.loteInclude;

type LotDetail = Prisma.loteGetPayload<{ include: typeof detailInclude }>;

const workflowInclude = {
  etapas: {
    orderBy: { ordem: "asc" },
    include: { responsavel: true },
  },
} satisfies Prisma.cadeia_custodiaInclude;

type CustodyWorkflow = Prisma.cadeia_custodiaGetPayload<{ include: typeof workflowInclude }>;

const summaryInclude = {
  produto: true,
  participante: true,
} satisfies Prisma.loteInclude;

type LotSummaryRow = Prisma.loteGetPayload<{ include: typeof summaryInclude }>;

function toLotSummary(lote: LotSummaryRow) {
  const unit = lote.unidade_medida ?? "";

  return {
    value: lote.codigo,
    label: `${lote.codigo} — ${lote.produto.nome}`,
    product: lote.produto.nome,
    detail: lote.data_fabricacao
      ? `Fabricado em ${formatDate(lote.data_fabricacao)}`
      : (lote.produto.categoria ?? ""),
    quantity: lote.quantidade ? `${lote.quantidade.toString()} ${unit}`.trim() : "",
    status: statusLabel(lote.status),
    currentOwner: lote.participante?.nome ?? "",
  };
}

/**
 * Monta a linha do tempo de custódia:
 *  - origem: fabricante que criou o lote (sempre concluída);
 *  - uma etapa por transferência: confirmada (concluída), pendente ou com ocorrência;
 *  - a última etapa concluída vira a "atual" (quem tem o lote hoje).
 */
export function buildCustodySteps(lote: LotDetail): CustodyStepDto[] {
  const steps: CustodyStepDto[] = [];
  const manufacturer = lote.produto.fabricante;

  steps.push({
    id: "origin",
    state: "done",
    org: manufacturer?.nome ?? lote.participante?.nome ?? "Origem não informada",
    role: describeRole(manufacturer?.tipo ?? "Fabricante"),
    person: lote.usuario_cadastro?.nome ?? "—",
    location: lote.localizacao_origem ?? "—",
    date: lote.data_fabricacao ? formatDate(lote.data_fabricacao) : "—",
    type: "Criação do lote",
    hash: null,
  });

  for (const movement of lote.movimentacao) {
    const destination = movement.participante_movimentacao_destino_idToparticipante;
    const sentAt = movement.data_movimentacao ?? new Date();

    const common = {
      id: `mov-${movement.id}`,
      org: destination.nome,
      role: describeRole(destination.tipo),
      location: movement.localizacao ?? "—",
      hash: movement.tx_hash,
    };

    if (movement.status === "CONFIRMADA") {
      steps.push({
        ...common,
        state: "done",
        person: `Enviado por ${movement.usuario.nome}`,
        date: formatDateTime(movement.confirmado_em ?? sentAt),
        type: "Recebimento confirmado",
      });
    } else if (movement.status === "COM_OCORRENCIA") {
      steps.push({
        ...common,
        state: "issue",
        person: `Enviado por ${movement.usuario.nome}`,
        date: formatDateTime(sentAt),
        type: "Ocorrência registrada",
      });
    } else {
      steps.push({
        ...common,
        state: "pending",
        person: "Aguardando confirmação do destino",
        date: `Enviado em ${formatDateTime(sentAt)}`,
        type: "Aguardando confirmação",
      });
    }
  }

  const lastDone = steps.map((step) => step.state).lastIndexOf("done");
  if (lastDone >= 0) steps[lastDone].state = "current";

  return steps;
}

/**
 * Builds the planned workflow, then overlays the real transfer records on each stage.
 * The previous builder remains as a fallback for lots created before a workflow existed.
 */
export function buildConfiguredCustodySteps(
  lote: LotDetail,
  workflow: CustodyWorkflow,
): CustodyStepDto[] {
  const movementsByStage = workflow.etapas.map((stage, index) => {
    if (index === 0) return null;
    return lote.movimentacao.find((movement) =>
      movement.etapa_cadeia_id === stage.id ||
      (stage.responsavel_id != null && movement.destino_id === stage.responsavel_id),
    ) ?? null;
  });

  const confirmedIndexes = movementsByStage.flatMap((movement, index) =>
    movement?.status === "CONFIRMADA" ? [index] : [],
  );
  const currentIndex = confirmedIndexes.length > 0
    ? Math.max(...confirmedIndexes)
    : 0;

  return workflow.etapas.map((stage, index) => {
    const movement = movementsByStage[index];
    let state: StepState;

    if (movement?.status === "COM_OCORRENCIA") state = "issue";
    else if (movement?.status === "AGUARDANDO_CONFIRMACAO") state = "pending";
    else if (index < currentIndex) state = "done";
    else if (index === currentIndex) state = "current";
    else state = "pending";

    const assignedOrganization = stage.responsavel?.nome ?? stage.endereco_carteira;
    const role = describeRole(stage.papel);
    const date = movement
      ? formatDateTime(movement.confirmado_em ?? movement.data_movimentacao ?? new Date())
      : index === 0 && lote.data_fabricacao
        ? formatDate(lote.data_fabricacao)
        : "Aguardando etapa";

    return {
      id: `stage-${stage.id}`,
      stageName: stage.nome,
      state,
      org: assignedOrganization,
      role,
      person: movement
        ? `Registrado por ${movement.usuario.nome}`
        : index === 0 && lote.usuario_cadastro?.nome
          ? lote.usuario_cadastro.nome
          : "Equipe da organização designada",
      location: movement?.localizacao ?? (index === 0 ? lote.localizacao_origem ?? "—" : "—"),
      date,
      type: movement
        ? movement.status === "CONFIRMADA"
          ? "Etapa concluída"
          : movement.status === "COM_OCORRENCIA"
            ? "Ocorrência registrada"
            : "Aguardando confirmação"
        : index === 0
          ? "Origem do lote"
          : `Etapa planejada: ${stage.nome}`,
      hash: movement?.tx_hash ?? null,
    };
  });
}

function paramValue(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

// Lotes que a organização pode acompanhar (para o seletor da tela)
router.get("/lotes", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const lots = await prisma.lote.findMany({
      where: visibleTo(user.participante_id),
      include: summaryInclude,
      orderBy: { id: "desc" },
    });

    response.json({ lots: lots.map(toLotSummary) });
  } catch (error) {
    console.error("Erro ao listar lotes da cadeia de custódia:", error);
    response.status(500).json({ message: "Não foi possível carregar os lotes." });
  }
});

// Linha do tempo de custódia de um lote
router.get("/lotes/:codigo", autenticar, async (request, response) => {
  const code = paramValue(request.params.codigo);
  if (!code) {
    response.status(400).json({ message: "Informe o código do lote." });
    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const lote = await prisma.lote.findFirst({
      where: { AND: [{ codigo: code }, visibleTo(user.participante_id)] },
      include: detailInclude,
    });

    if (!lote) {
      response.status(404).json({ message: "Lote não encontrado para a sua organização." });
      return;
    }

    const workflow = lote.produto.fabricante_id
      ? await prisma.cadeia_custodia.findUnique({
        where: { organizacao_id: lote.produto.fabricante_id },
        include: workflowInclude,
      })
      : null;

    response.json({
      lot: toLotSummary(lote),
      steps: workflow
        ? buildConfiguredCustodySteps(lote, workflow)
        : buildCustodySteps(lote),
    });
  } catch (error) {
    console.error("Erro ao carregar a cadeia de custódia:", error);
    response.status(500).json({ message: "Não foi possível carregar a cadeia de custódia." });
  }
});

export default router;
