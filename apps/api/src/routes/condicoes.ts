import { Prisma } from "@prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";

import { getConditionBreaches, revertReasonOf } from "../blockchain";
import { orgSignerKey, reportConditions } from "../chain/org-chain";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser } from "../utils/session";

const router = Router();

/**
 * FR-10/FR-11: reports a sensor reading on-chain for a lot's batch. Only the current
 * custodian may report — the chain itself does not check who calls `reportCondition`
 * (docs/context.md §3), so the application layer enforces it here.
 */
const reportSchema = z
  .object({
    temperature: z.coerce.number().finite().optional(),
    humidity: z.coerce.number().finite().min(0).max(100).optional(),
    location: z.string().trim().max(200).optional(),
  })
  .refine(
    ({ temperature, humidity }) => temperature !== undefined || humidity !== undefined,
    { message: "Informe ao menos uma leitura de temperatura ou umidade." },
  );

function codigoParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function chainFailure(response: Response, error: unknown): void {
  const revertReason = revertReasonOf(error);
  if (revertReason !== undefined) {
    response.status(409).json({ message: `A blockchain rejeitou a operação: ${revertReason}` });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  response.status(502).json({ message: `Erro de comunicação com a blockchain: ${message}` });
}

router.post("/:codigo/condicoes", autenticar, async (request, response) => {
  const parsed = reportSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Confira os dados da leitura de condição.",
      errors: parsed.error.issues.map(({ path, message }) => ({ field: path.join("."), message })),
    });
    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id || !user.participante) return;

    const codigo = codigoParam(request.params.codigo);
    if (!codigo) {
      response.status(400).json({ message: "Código de lote inválido." });
      return;
    }

    const lot = await prisma.lote.findUnique({
      where: { codigo },
      include: { produto: { include: { fabricante: true } } },
    });
    if (!lot) {
      response.status(404).json({ message: "Lote não encontrado." });
      return;
    }
    if (lot.responsavel_atual_id !== user.participante_id) {
      response.status(403).json({
        message: "Apenas o custodiante atual do lote pode registrar condições.",
      });
      return;
    }

    const fabricante = lot.produto.fabricante;
    if (!lot.chain_batch_id || !fabricante?.workflow_address || !user.participante.wallet_address) {
      response.status(409).json({ message: "Este lote não possui registro on-chain." });
      return;
    }

    try {
      const reported = await reportConditions({
        workflowAddress: fabricante.workflow_address,
        batchId: BigInt(lot.chain_batch_id),
        signerKey: orgSignerKey(user.participante.wallet_address),
        temperature: parsed.data.temperature ?? null,
        humidity: parsed.data.humidity ?? null,
      });

      const breached = reported.some((reading) => reading.breached);
      await prisma.$transaction(async (tx) => {
        await tx.registro_condicao.create({
          data: {
            lote_id: lot.id,
            temperatura:
              parsed.data.temperature != null ? new Prisma.Decimal(parsed.data.temperature) : null,
            umidade: parsed.data.humidity != null ? new Prisma.Decimal(parsed.data.humidity) : null,
            localizacao: parsed.data.location ?? lot.localizacao_origem,
          },
        });
        if (breached) {
          await tx.lote.update({ where: { id: lot.id }, data: { status: "COM_OCORRENCIA" } });
        }
      });

      response.status(201).json({ readings: reported });
    } catch (error) {
      chainFailure(response, error);
    }
  } catch (error) {
    console.error("Erro ao registrar condição do lote:", error);
    response.status(500).json({ message: "Não foi possível registrar a condição do lote." });
  }
});

router.get("/:codigo/condicoes", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const codigo = codigoParam(request.params.codigo);
    if (!codigo) {
      response.status(400).json({ message: "Código de lote inválido." });
      return;
    }

    const lot = await prisma.lote.findUnique({
      where: { codigo },
      include: { produto: { include: { fabricante: true } } },
    });
    if (!lot) {
      response.status(404).json({ message: "Lote não encontrado." });
      return;
    }

    const fabricante = lot.produto.fabricante;
    if (!lot.chain_batch_id || !fabricante?.workflow_address) {
      response.json({ breaches: [] });
      return;
    }

    try {
      const breaches = await getConditionBreaches(fabricante.workflow_address, BigInt(lot.chain_batch_id));
      response.json({
        breaches: breaches.map((event) => ({
          conditionKey: event.conditionKey,
          value: event.value.toString(),
          threshold: event.threshold.toString(),
          timestamp: event.timestamp,
          transactionHash: event.transactionHash,
        })),
      });
    } catch (error) {
      chainFailure(response, error);
    }
  } catch (error) {
    console.error("Erro ao consultar condições do lote:", error);
    response.status(500).json({ message: "Não foi possível consultar as condições do lote." });
  }
});

export default router;
