import { Prisma } from "@prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { autenticar } from "../middlewares/auth.middleware";
import type { JwtPayload } from "../utils/jwt";
import {
  createBatch,
  deriveLotBatchId,
  getWorkflowForOrganization,
  getWorkflowSteps,
  isWorkflowFactoryVersionError,
} from "../blockchain";
import { env } from "../config/env";

const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    code: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(100),
    description: z.string().trim().max(5_000).nullable().optional(),
    lot: z.string().trim().min(1).max(100),
    manufacturingDate: z.iso.date(),
    expirationDate: z.iso.date().nullable().optional(),
    quantity: z.coerce.number().finite().positive().max(99_999_999_999.999),
    unit: z.string().trim().min(1).max(30),
    location: z.string().trim().min(1).max(200),
  })
  .refine(
    ({ manufacturingDate, expirationDate }) =>
      !expirationDate || expirationDate >= manufacturingDate,
    {
      path: ["expirationDate"],
      message: "A validade não pode ser anterior à data de fabricação.",
    },
  );

type CreatedProductInput = z.infer<typeof createProductSchema>;

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

async function loadAuthenticatedUser(
  payload: JwtPayload | undefined,
  response: Response,
) {
  if (!payload) {
    response.status(401).json({ message: "Autenticação necessária." });
    return null;
  }

  let userId: bigint;
  try {
    userId = BigInt(payload.usuarioId);
  } catch {
    response.status(401).json({ message: "Sessão inválida ou expirada." });
    return null;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { participante: true },
  });

  if (
    !usuario ||
    !usuario.participante_id ||
    usuario.participante_id.toString() !== payload.participanteId
  ) {
    response.status(401).json({ message: "Sessão inválida ou expirada." });
    return null;
  }

  if (!usuario.participante?.ativo) {
    response.status(403).json({
      message: "Sua organização está desativada. Entre em contato com o suporte.",
    });
    return null;
  }

  return usuario;
}

router.get("/", autenticar, async (request, response) => {
  try {
    const usuario = await loadAuthenticatedUser(request.usuario, response);
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
    const usuario = await loadAuthenticatedUser(request.usuario, response);
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
  const parsed = createProductSchema.safeParse(request.body);
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
    const usuario = await loadAuthenticatedUser(request.usuario, response);
    if (!usuario?.participante_id) return;

    const input: CreatedProductInput = parsed.data;
    let workflowAddress: string | null = null;
    if (env.WORKFLOW_FACTORY_ADDRESS) {
      try {
        workflowAddress = await getWorkflowForOrganization(usuario.participante_id);
      } catch (error) {
        if (!isWorkflowFactoryVersionError(error)) throw error;
        console.warn(error.message);
      }
    }
    const ownerWallet = usuario.participante?.wallet_address;
    if (workflowAddress) {
      const workflowSteps = await getWorkflowSteps(workflowAddress);
      if (!ownerWallet || workflowSteps[0]?.assignee.toLowerCase() !== ownerWallet.toLowerCase()) {
        response.status(409).json({
          message: "A carteira da sua organização não está atribuída à primeira etapa da cadeia.",
        });
        return;
      }
    }

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

    let batchId: string | undefined;
    if (workflowAddress) {
      batchId = (await deriveLotBatchId(product.lot.codigo)).toString();
      if (!ownerWallet) throw new Error("Organization wallet disappeared while creating its chain batch");
      await createBatch(workflowAddress, BigInt(batchId), ownerWallet);
    }

    response.status(201).json({
      ...(batchId ? { batchId } : {}),
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
