import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser } from "../utils/session";

const router = Router();
const zoneOffset = "-03:00"; // Horário de Brasília

const querySchema = z.object({
  period: z.enum(["7", "30", "90", "year", "custom"]).default("30"),
  organizationId: z.string().regex(/^\d+$/).optional(),
  category: z.string().optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});


function dateStart(value: string) {
  return new Date(`${value}T00:00:00.000${zoneOffset}`);
}
function dateEnd(value: string) {
  return new Date(`${value}T23:59:59.999${zoneOffset}`);
}
function monthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}
function formatMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15, 12)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
}
function daysBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end.getTime() < start.getTime()) return null;
  return (end.getTime() - start.getTime()) / 86_400_000;
}
function isConfirmed(status: string) {
  return status === "CONFIRMADA";
}
function isIssue(status: string) {
  return status === "COM_OCORRENCIA";
}


router.get("/", autenticar, async (request, response) => {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ message: "Filtros de relatório inválidos." });
    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const { period, organizationId, category, startDate, endDate } = parsed.data;
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    if (period === "custom") {
      if (startDate) from = dateStart(startDate);
      if (endDate) to = dateEnd(endDate);
      if (startDate && endDate && startDate > endDate) {
        response.status(400).json({ message: "A data inicial não pode ser posterior à data final." });
        return;
      }
    } else if (period === "year") {
      const year = Number(now.toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }));
      from = dateStart(`${year}-01-01`);
      to = dateEnd(`${year}-12-31`);
    } else {
      const days = Number(period);
      const localParts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo",
      }).formatToParts(now);
      const year = Number(localParts.find((part) => part.type === "year")?.value);
      const month = Number(localParts.find((part) => part.type === "month")?.value);
      const day = Number(localParts.find((part) => part.type === "day")?.value);
      const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const start = new Date(Date.UTC(year, month - 1, day));
      start.setUTCDate(start.getUTCDate() - (days - 1));
      from = dateStart(start.toISOString().slice(0, 10));
      to = dateEnd(today);
    }

    const dateWhere = from || to ? {
      data_movimentacao: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    } : {};

    // The report only includes movements involving the authenticated organization.
    const movementRows = await prisma.movimentacao.findMany({
      where: {
        tipo: "TRANSFERENCIA",
        OR: [
          { origem_id: user.participante_id },
          { destino_id: user.participante_id },
        ],
        ...dateWhere,
      },
      include: {
        lote: { include: { produto: true } },
        participante_movimentacao_origem_idToparticipante: true,
        participante_movimentacao_destino_idToparticipante: true,
      },
      orderBy: { data_movimentacao: "desc" },
    });

    const allCategories = Array.from(new Set(
      movementRows.map((row) => row.lote.produto.categoria).filter((value): value is string => Boolean(value?.trim())),
    )).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const allOrganizations = new Map<string, { id: string; name: string; type: string }>();
    for (const row of movementRows) {
      const origin = row.participante_movimentacao_origem_idToparticipante;
      const destination = row.participante_movimentacao_destino_idToparticipante;
      if (origin) allOrganizations.set(origin.id.toString(), { id: origin.id.toString(), name: origin.nome, type: origin.tipo ?? "—" });
      if (destination) allOrganizations.set(destination.id.toString(), { id: destination.id.toString(), name: destination.nome, type: destination.tipo ?? "—" });
    }

    const filteredRows = movementRows.filter((row) => {
      const rowCategory = row.lote.produto.categoria ?? "Sem categoria";
      const matchesCategory = !category || category === "all" || rowCategory === category;
      const matchesOrganization = !organizationId || organizationId === "all" ||
        row.origem_id?.toString() === organizationId || row.destino_id.toString() === organizationId;
      return matchesCategory && matchesOrganization;
    });

    const records = filteredRows.map((row) => {
      const createdAt = row.data_movimentacao;
      const transitDays = isConfirmed(row.status) ? daysBetween(createdAt, row.confirmado_em) : null;
      return {
        id: row.id.toString(),
        date: createdAt?.toISOString() ?? null,
        lotCode: row.lote.codigo,
        productName: row.lote.produto.nome,
        category: row.lote.produto.categoria ?? "Sem categoria",
        originId: row.origem_id?.toString() ?? null,
        originName: row.participante_movimentacao_origem_idToparticipante?.nome ?? "—",
        destinationId: row.destino_id.toString(),
        destinationName: row.participante_movimentacao_destino_idToparticipante.nome,
        status: row.status,
        statusLabel: row.status === "CONFIRMADA" ? "Confirmada" : row.status === "COM_OCORRENCIA" ? "Com ocorrência" : "Aguardando confirmação",
        location: row.localizacao ?? "",
        quantity: row.quantidade?.toString() ?? row.lote.quantidade?.toString() ?? "",
        unit: row.lote.unidade_medida ?? "",
        txHash: row.tx_hash,
        temperature: row.temperatura?.toString() ?? null,
        humidity: row.umidade?.toString() ?? null,
        transitDays,
      };
    });

    const confirmedRecords = records.filter((record) => record.transitDays !== null);
    const averageTransitDays = confirmedRecords.length
      ? confirmedRecords.reduce((sum, record) => sum + (record.transitDays ?? 0), 0) / confirmedRecords.length
      : 0;
    const confirmedCount = filteredRows.filter((row) => isConfirmed(row.status)).length;
    const occurrenceCount = filteredRows.filter((row) => isIssue(row.status)).length;
    const confirmationRate = filteredRows.length ? (confirmedCount / filteredRows.length) * 100 : 0;

    const monthlyMap = new Map<string, number>();
    for (const row of filteredRows) {
      if (!row.data_movimentacao) continue;
      const key = monthKey(row.data_movimentacao);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
    }
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, movements]) => ({ month: key, label: formatMonth(key), movements }));

    const categoryMap = new Map<string, { total: number; confirmed: number; occurrences: number }>();
    for (const row of filteredRows) {
      const name = row.lote.produto.categoria ?? "Sem categoria";
      const entry = categoryMap.get(name) ?? { total: 0, confirmed: 0, occurrences: 0 };
      entry.total += 1;
      if (isConfirmed(row.status)) entry.confirmed += 1;
      if (isIssue(row.status)) entry.occurrences += 1;
      categoryMap.set(name, entry);
    }
    const categories = Array.from(categoryMap.entries()).map(([category, entry]) => ({
      category,
      total: entry.total,
      confirmationRate: entry.total ? (entry.confirmed / entry.total) * 100 : 0,
      occurrences: entry.occurrences,
    })).sort((a, b) => a.category.localeCompare(b.category, "pt-BR"));

    const organizationMap = new Map<string, { id: string; name: string; type: string; movements: Set<string>; confirmed: number; occurrence: number; transitSum: number; transitCount: number }>();
    for (const row of filteredRows) {
      const organizations = [row.participante_movimentacao_origem_idToparticipante, row.participante_movimentacao_destino_idToparticipante].filter(Boolean);
      const transitDays = isConfirmed(row.status) ? daysBetween(row.data_movimentacao, row.confirmado_em) : null;
      for (const participant of organizations) {
        if (!participant) continue;
        const key = participant.id.toString();
        const entry = organizationMap.get(key) ?? {
          id: key, name: participant.nome, type: participant.tipo ?? "—", movements: new Set<string>(), confirmed: 0, occurrence: 0, transitSum: 0, transitCount: 0,
        };
        entry.movements.add(row.id.toString());
        if (isConfirmed(row.status)) entry.confirmed += 1;
        if (isIssue(row.status)) entry.occurrence += 1;
        if (transitDays !== null) { entry.transitSum += transitDays; entry.transitCount += 1; }
        organizationMap.set(key, entry);
      }
    }
    const organizations = Array.from(organizationMap.values()).map((entry) => ({
      id: entry.id,
      organization: entry.name,
      type: entry.type,
      movements: entry.movements.size,
      averageTransitDays: entry.transitCount ? entry.transitSum / entry.transitCount : 0,
      confirmationRate: entry.movements.size ? (entry.confirmed / entry.movements.size) * 100 : 0,
      occurrences: entry.occurrence,
    })).sort((a, b) => b.movements - a.movements || a.organization.localeCompare(b.organization, "pt-BR"));

    response.json({
      metrics: {
        movements: filteredRows.length,
        confirmed: confirmedCount,
        averageTransitDays,
        confirmationRate,
        occurrences: occurrenceCount,
      },
      monthly,
      categories,
      organizations,
      organizationOptions: Array.from(allOrganizations.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      categoryOptions: allCategories,
      records,
    });
  } catch (error) {
    console.error("Erro ao gerar relatórios:", error);
    response.status(500).json({ message: "Não foi possível gerar os relatórios." });
  }
});


export default router;
