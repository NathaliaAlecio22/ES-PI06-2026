/**
 * Cadeia de custódia (rota /api/custodia) com o Prisma simulado.
 * Rodar:  npm run test:custodia
 */
import "./helpers/test-env";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { Prisma } from "@prisma/client";
import express from "express";
import supertest from "supertest";

import * as prismaModule from "../src/lib/prisma";
import custodiaRouter, { buildCustodySteps } from "../src/routes/custodia";
import { gerarToken } from "../src/utils/jwt";

type Impl = (...args: any[]) => any;
type Mock = Impl & { calls: any[][]; impl: Impl };
function mock(impl: Impl = () => undefined): Mock {
  const fn = ((...args: any[]) => {
    fn.calls.push(args);
    return fn.impl(...args);
  }) as Mock;
  fn.calls = [];
  fn.impl = impl;
  return fn;
}

const db = {
  usuario: { findUnique: mock() },
  lote: { findMany: mock(), findFirst: mock() },
};
(prismaModule as any).prisma = db;

const app = express();
app.use(express.json());
app.use("/api/custodia", custodiaRouter);
const request = supertest(app);

const fazenda = { id: 1n, nome: "Fazenda Santa Clara", tipo: "Fabricante", ativo: true };
const translog = { id: 2n, nome: "TransLog Brasil", tipo: "Transportadora", ativo: true };
const armazem = { id: 3n, nome: "Centro Logístico Guarulhos", tipo: "Centro de armazenamento", ativo: true };

const maria = { nome: "Maria Souza" };
const roberto = { nome: "Roberto Lima" };

function login(org = fazenda) {
  db.usuario.findUnique.impl = async () => ({
    id: 10n, perfil: "ADMINISTRADOR", ativo: true, participante_id: org.id, participante: org,
  });
  return { Authorization: `Bearer ${gerarToken({ usuarioId: "10", participanteId: org.id.toString(), perfil: "ADMINISTRADOR" })}` };
}

function movement(overrides: Record<string, unknown>) {
  return {
    id: 1n,
    tipo: "TRANSFERENCIA",
    status: "CONFIRMADA",
    localizacao: "Rod. Fernão Dias, km 824",
    tx_hash: null,
    data_movimentacao: new Date("2026-05-24T17:32:00Z"), // 14:32 em São Paulo
    confirmado_em: new Date("2026-05-24T18:10:00Z"),
    usuario: maria,
    participante_movimentacao_destino_idToparticipante: translog,
    ...overrides,
  };
}

function lote(movs: unknown[] = [], overrides: Record<string, unknown> = {}) {
  return {
    id: 100n,
    codigo: "LT-2026-0482",
    status: "EM_TRANSPORTE",
    quantidade: new Prisma.Decimal("1200"),
    unidade_medida: "kg",
    data_fabricacao: new Date("2026-05-18T00:00:00Z"),
    localizacao_origem: "Varginha, MG",
    produto: { nome: "Café Arábica Premium", categoria: "Grãos", fabricante: fazenda },
    participante: translog,
    usuario_cadastro: maria,
    movimentacao: movs,
    ...overrides,
  };
}

beforeEach(() => {
  db.lote.findMany.impl = async () => [];
  db.lote.findFirst.impl = async () => null;
});

describe("buildCustodySteps", () => {
  it("lote recém-criado: só a origem, como etapa atual", () => {
    const steps = buildCustodySteps(lote([]) as any);
    assert.equal(steps.length, 1);
    assert.deepEqual(steps[0], {
      id: "origin", state: "current", org: "Fazenda Santa Clara", role: "Produção e registro de origem",
      person: "Maria Souza", location: "Varginha, MG", date: "18 mai 2026", type: "Criação do lote", hash: null,
    });
  });

  it("transferência pendente: origem segue como atual e o destino aparece como pendente", () => {
    const steps = buildCustodySteps(lote([movement({ status: "AGUARDANDO_CONFIRMACAO", confirmado_em: null })]) as any);
    assert.deepEqual(steps.map((s) => s.state), ["current", "pending"]);
    assert.equal(steps[1].org, "TransLog Brasil");
    assert.equal(steps[1].role, "Transporte");
    assert.equal(steps[1].type, "Aguardando confirmação");
    assert.equal(steps[1].date, "Enviado em 24 mai 2026 • 14:32");
  });

  it("transferência confirmada: origem concluída e destino é o responsável atual", () => {
    const hash = `0x${"ab".repeat(32)}`;
    const steps = buildCustodySteps(lote([movement({ tx_hash: hash })]) as any);
    assert.deepEqual(steps.map((s) => s.state), ["done", "current"]);
    assert.equal(steps[1].date, "24 mai 2026 • 15:10");
    assert.equal(steps[1].person, "Enviado por Maria Souza");
    assert.equal(steps[1].hash, hash);
  });

  it("cadeia com várias etapas, ocorrência e transferência pendente", () => {
    const steps = buildCustodySteps(
      lote([
        movement({ id: 1n }),
        movement({ id: 2n, status: "COM_OCORRENCIA", usuario: roberto, participante_movimentacao_destino_idToparticipante: armazem, confirmado_em: null }),
        movement({ id: 3n, status: "AGUARDANDO_CONFIRMACAO", confirmado_em: null, participante_movimentacao_destino_idToparticipante: armazem }),
      ]) as any,
    );
    assert.deepEqual(steps.map((s) => s.state), ["done", "current", "issue", "pending"]);
    assert.deepEqual(steps.map((s) => s.id), ["origin", "mov-1", "mov-2", "mov-3"]);
    assert.equal(steps[2].type, "Ocorrência registrada");
    assert.equal(steps[3].role, "Recebimento e armazenagem");
  });
});

describe("GET /api/custodia", () => {
  it("exige autenticação", async () => {
    assert.equal((await request.get("/api/custodia/lotes")).status, 401);
  });

  it("lista os lotes visíveis para a organização (fabricou, tem ou participou)", async () => {
    const headers = login();
    db.lote.findMany.impl = async () => [lote()];

    const response = await request.get("/api/custodia/lotes").set(headers);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.lots, [{
      value: "LT-2026-0482",
      label: "LT-2026-0482 — Café Arábica Premium",
      product: "Café Arábica Premium",
      detail: "Fabricado em 18 mai 2026",
      quantity: "1200 kg",
      status: "Em transporte",
      currentOwner: "TransLog Brasil",
    }]);

    const where = db.lote.findMany.calls[0][0].where;
    assert.deepEqual(where.OR[0], { responsavel_atual_id: 1n });
    assert.deepEqual(where.OR[1], { produto: { fabricante_id: 1n } });
    assert.ok(where.OR[2].movimentacao.some.OR);
  });

  it("devolve a linha do tempo de um lote (código com caracteres especiais)", async () => {
    const headers = login();
    db.lote.findFirst.impl = async () => lote([movement({})], { codigo: "LT/2026 0482" });

    const response = await request.get(`/api/custodia/lotes/${encodeURIComponent("LT/2026 0482")}`).set(headers);
    assert.equal(response.status, 200);
    assert.equal(response.body.lot.value, "LT/2026 0482");
    assert.deepEqual(response.body.steps.map((s: any) => s.state), ["done", "current"]);

    const where = db.lote.findFirst.calls[0][0].where;
    assert.equal(where.AND[0].codigo, "LT/2026 0482");
    assert.ok(where.AND[1].OR);
  });

  it("404 quando o lote não existe ou não é visível para a organização", async () => {
    const headers = login(armazem);
    const response = await request.get("/api/custodia/lotes/LT-OUTRO").set(headers);
    assert.equal(response.status, 404);
  });
});
