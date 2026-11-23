import { Prisma } from "@prisma/client";
import { Router } from "express";

import { createProductRequestSchema, type CreateProductRequest } from "@provenance/shared";

import { prisma } from "../lib/prisma";
import { createBatch, getWorkflowSteps, revertReasonOf } from "../blockchain";
import { orgSignerKey } from "../chain/org-chain";
import { autenticar } from "../middlewares/auth.middleware";
import { createId } from "../store";
import { loadCurrentUser } from "../utils/session";

const router = Router();

async function findConfiguredCustodyChain(organizationId: bigint) {
  const chain = await prisma.cadeia_custodia.findUnique({
    where: { organizacao_id: organizationId },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });
  if (!chain || chain.etapas.length === 0) return null;

  const onChainSteps = await getWorkflowSteps(chain.endereco_contrato);
  const matchesPersistedSteps =
    onChainSteps.length === chain.etapas.length &&
    chain.etapas.every((step, index) => {
      const onChainStep = onChainSteps[index];
      return (
        step.ordem === index &&
        onChainStep.name === step.nome &&
        onChainStep.requiredRole === step.papel &&
        onChainStep.specificationHash.toLowerCase() === step.hash_especificacao.toLowerCase()
      );
    });

  return matchesPersistedSteps ? chain : null;
}

router.get("/workflow-status", autenticar, async (request, response) => {
  try {
    const usuario = await loadCurrentUser(request.usuario, response);
    if (!usuario?.participante_id) return;

    const chain = await findConfiguredCustodyChain(usuario.participante_id);
    response.json({ configured: Boolean(chain) });
  } catch (error) {
    console.error("Erro ao verificar a cadeia de custódia para cadastro de produto:", error);
    response.status(503).json({
      message: "Não foi possível verificar a cadeia de custódia na blockchain.",
    });
  }
});

function statusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "EM_TRANSPORTE":
    case "EM TRANSPORTE":
    case "TRANSPORTE":
      return "Em transporte";
    case "ARMAZENADO":
    case "ATIVO":
    case "ARMAZENAGEM":
      return "Armazenado";
    case "PENDENTE":
      return "Pendente";
    case "ENTREGUE":
      return "Entregue";
    case "EM_PRODUCAO":
    case "EM PRODUÇÃO":
      return "Em produção";
    case "COM_OCORRENCIA":
    case "COM OCORRÊNCIA":
      return "Com ocorrência";
    default:
      return "Pendente";
  }
}

function dateOnly(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

function toProductRow(product: {
  codigo: string | null;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  fabricante: { nome: string } | null;
  lote: Array<{
    codigo: string;
    data_fabricacao: Date | null;
    data_validade: Date | null;
    quantidade: Prisma.Decimal | null;
    unidade_medida: string | null;
    localizacao_origem: string | null;
    status: string;
    participante: { nome: string } | null;
    usuario_cadastro: { nome: string } | null;
  }>,
}) {
  return product.lote.map((lot) => ({
    code: product.codigo ?? "",
    name: product.nome,
    lot: lot.codigo,
    category: product.categoria ?? "",
    manufacturingDate: dateOnly(lot.data_fabricacao),
    owner: lot.participante?.nome ?? product.fabricante?.nome ?? "",
    location: lot.localizacao_origem ?? "",
    status: statusLabel(lot.status),
    quantity: lot.quantidade?.toString() ?? "",
    unit: lot.unidade_medida ?? "",
    expirationDate: dateOnly(lot.data_validade),
    description: product.descricao ?? "",
    manufacturer: product.fabricante?.nome ?? "",
    responsible: lot.usuario_cadastro?.nome ?? "",
  }));
}

router.get("/", autenticar, async (request, response) => {
  try {
    const usuario = await loadCurrentUser(request.usuario, response);
    if (!usuario?.participante_id) return;

    // An organization sees the lots it holds and the lots of products it registered (the
    // chain's admin may not hold a step, so its lots sit with the step-1 participant).
    const visibleLots = {
      OR: [
        {responsavel_atual_id: usuario.participante_id},
        {produto: {fabricante_id: usuario.participante_id}},
      ],
    };

    const products = await prisma.produto.findMany({
     where: {lote: {some: visibleLots}},
     include: {
      fabricante: true,
      lote: {
        where: visibleLots,
        include: {participante: true, usuario_cadastro: true},
        orderBy: {id: "desc"}
      },
     },
     orderBy: {id: "desc"}
    });

    response.json({ products: products.flatMap(toProductRow) });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    response.status(500).json({ message: "Não foi possível carregar os produtos." });
  }
});

router.get("/stats", autenticar, async (request, response) => {
  try {
    const usuario = await loadCurrentUser(request.usuario, response);
    if (!usuario?.participante_id) return;

    const lots = await prisma.lote.findMany({
      where: {
        OR: [
          {responsavel_atual_id: usuario.participante_id},
          {produto: {fabricante_id: usuario.participante_id}},
        ],
      },
      select: {status: true},
    });

    const stats = lots.reduce(
      (totals, lot) => {
        const status = statusLabel(lot.status);
        totals.total += 1;
        if (status === "Em transporte") totals.inTransit += 1;
        if (status === "Armazenado") totals.stored += 1;
        if (status === "Pendente") totals.pending += 1;
        return totals;
      },
      { total: 0, inTransit: 0, stored: 0, pending: 0 },
    );

    response.json(stats);
  } catch (error) {
    console.error("Erro ao consultar estatísticas de produtos:", error);
    response.status(500).json({
      message: "Não foi possível carregar os indicadores de lotes.",
    });
  }
});

router.post("/", autenticar, async (request, response) => {
  const parsed = createProductRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Confira os dados do produto e do lote.",
      errors: parsed.error.issues.map(({ path, message }) => ({
        field: path.join("."),
        message,
      })),
    });
    return;
  }

  try {
    const usuario = await loadCurrentUser(request.usuario, response);
    if (!usuario?.participante_id || !usuario.participante) return;

    let chain;
    try {
      chain = await findConfiguredCustodyChain(usuario.participante_id);
    } catch (error) {
      console.error("Erro ao validar a cadeia de custódia antes do cadastro do produto:", error);
      response.status(503).json({
        message: "Não foi possível confirmar a cadeia de custódia na blockchain. Tente novamente quando a rede estiver disponível.",
      });
      return;
    }

    if (!chain) {
      response.status(409).json({
        message: "Configure uma cadeia de custódia com etapas e responsáveis antes de cadastrar produtos.",
      });
      return;
    }

    const organizationWallet = usuario.participante.wallet_address;
    if (!organizationWallet) {
      response.status(503).json({
        message: "A organização não possui uma carteira configurada para registrar o lote na blockchain.",
      });
      return;
    }

    let signerKey: string;
    try {
      signerKey = orgSignerKey(organizationWallet);
    } catch (error) {
      console.error("Não foi possível obter a carteira de assinatura da organização:", error);
      response.status(503).json({
        message: "A carteira da organização não está disponível para registrar o lote na blockchain.",
      });
      return;
    }

    // The batch starts at step 1 of the chain, held by that step's participant (which need
    // not be the organization itself, the workflow admin who signs the createBatch call).
    const firstStep = chain.etapas[0];

    const input: CreateProductRequest = parsed.data;
    const product = await prisma.$transaction(async (transaction) => {
      const createdProduct = await transaction.produto.create({
        data: {
          codigo: input.code,
          nome: input.name,
          categoria: input.category,
          descricao: input.description || null,
          fabricante_id: usuario.participante_id,
        },
      });

      const lot = await transaction.lote.create({
        data: {
          produto_id: createdProduct.id,
          codigo: input.lot,
          responsavel_atual_id: firstStep.responsavel_id ?? usuario.participante_id,
          responsavel_cadastro_id: usuario.id,
          data_fabricacao: new Date(`${input.manufacturingDate}T00:00:00.000Z`),
          data_validade: input.expirationDate
            ? new Date(`${input.expirationDate}T00:00:00.000Z`)
            : null,
          quantidade: new Prisma.Decimal(input.quantity),
          unidade_medida: input.unit,
          localizacao_origem: input.location,
          status: "ARMAZENADO",
        },
      });

      return { createdProduct, lot };
    });

    // Seeds the batch on the organization's own Workflow contract (chain second — the
    // Postgres rows above already exist by this point; an accepted PoC trade-off).
    try {
      const batchId = createId();
      await createBatch(chain.endereco_contrato, batchId, firstStep.endereco_carteira, signerKey);
      await prisma.lote.update({
        where: { id: product.lot.id },
        data: { chain_batch_id: batchId.toString(), current_step_index: 0 },
      });
    } catch (error) {
      const revertReason = revertReasonOf(error);
      const detail = revertReason ?? (error instanceof Error ? error.message : String(error));
      response.status(502).json({
        message:
          "O produto e o lote foram cadastrados, mas não foi possível registrar o lote na blockchain.",
        detail,
      });
      return;
    }

    response.status(201).json({
      product: {
        code: product.createdProduct.codigo,
        name: product.createdProduct.nome,
        lot: product.lot.codigo,
        category: product.createdProduct.categoria,
        manufacturingDate: dateOnly(product.lot.data_fabricacao),
        owner: usuario.participante?.nome ?? "",
        location: product.lot.localizacao_origem ?? "",
        status: statusLabel(product.lot.status),
        quantity: product.lot.quantidade?.toString() ?? "",
        unit: product.lot.unidade_medida ?? "",
        expirationDate: dateOnly(product.lot.data_validade),
        description: product.createdProduct.descricao ?? "",
        manufacturer: usuario.participante?.nome ?? "",
        responsible: usuario.nome,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Já existe um produto com esse código ou um lote com esse identificador.",
      });
      return;
    }

    console.error("Erro ao cadastrar produto e lote:", error);
    response.status(500).json({
      message: "Não foi possível cadastrar o produto e o lote.",
    });
  }
});

export default router;
