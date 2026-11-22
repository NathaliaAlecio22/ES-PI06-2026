import { Prisma } from "@prisma/client";
import { Router } from "express";

import { createProductRequestSchema, type CreateProductRequest } from "@provenance/shared";

import { prisma } from "../lib/prisma";
import { createBatch, revertReasonOf } from "../blockchain";
import { ensureWorkflowForParticipante } from "../chain/org-chain";
import { autenticar } from "../middlewares/auth.middleware";
import { createId } from "../store";
import { loadCurrentUser } from "../utils/session";

const router = Router();

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

    const products = await prisma.produto.findMany({
     where: {lote: {some: {responsavel_atual_id: usuario.participante_id}}},
     include: {
      fabricante: true,
      lote: {
        where: {responsavel_atual_id: usuario.participante_id},
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
      where: {responsavel_atual_id: usuario.participante_id},
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
          responsavel_atual_id: usuario.participante_id,
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
      const { workflowAddress, signerKey } = await ensureWorkflowForParticipante(usuario.participante);
      const batchId = createId();
      await createBatch(workflowAddress, batchId, usuario.participante.wallet_address!, signerKey);
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
