"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Cadeia de custódia (rota /api/custodia) com o Prisma simulado.
 * Rodar:  npm run test:custodia
 */
require("./helpers/test-env");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const prismaModule = __importStar(require("../src/lib/prisma"));
const custodia_1 = __importStar(require("../src/routes/custodia"));
const jwt_1 = require("../src/utils/jwt");
function mock(impl = () => undefined) {
    const fn = ((...args) => {
        fn.calls.push(args);
        return fn.impl(...args);
    });
    fn.calls = [];
    fn.impl = impl;
    return fn;
}
const db = {
    usuario: { findUnique: mock() },
    lote: { findMany: mock(), findFirst: mock() },
};
prismaModule.prisma = db;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/custodia", custodia_1.default);
const request = (0, supertest_1.default)(app);
const fazenda = { id: 1n, nome: "Fazenda Santa Clara", tipo: "Fabricante", ativo: true };
const translog = { id: 2n, nome: "TransLog Brasil", tipo: "Transportadora", ativo: true };
const armazem = { id: 3n, nome: "Centro Logístico Guarulhos", tipo: "Centro de armazenamento", ativo: true };
const maria = { nome: "Maria Souza" };
const roberto = { nome: "Roberto Lima" };
function login(org = fazenda) {
    db.usuario.findUnique.impl = async () => ({
        id: 10n, perfil: "ADMINISTRADOR", ativo: true, participante_id: org.id, participante: org,
    });
    return { Authorization: `Bearer ${(0, jwt_1.gerarToken)({ usuarioId: "10", participanteId: org.id.toString(), perfil: "ADMINISTRADOR" })}` };
}
function movement(overrides) {
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
function lote(movs = [], overrides = {}) {
    return {
        id: 100n,
        codigo: "LT-2026-0482",
        status: "EM_TRANSPORTE",
        quantidade: new client_1.Prisma.Decimal("1200"),
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
(0, node_test_1.beforeEach)(() => {
    db.lote.findMany.impl = async () => [];
    db.lote.findFirst.impl = async () => null;
});
(0, node_test_1.describe)("buildCustodySteps", () => {
    (0, node_test_1.it)("lote recém-criado: só a origem, como etapa atual", () => {
        const steps = (0, custodia_1.buildCustodySteps)(lote([]));
        strict_1.default.equal(steps.length, 1);
        strict_1.default.deepEqual(steps[0], {
            id: "origin", state: "current", org: "Fazenda Santa Clara", role: "Produção e registro de origem",
            person: "Maria Souza", location: "Varginha, MG", date: "18 mai 2026", type: "Criação do lote", hash: null,
        });
    });
    (0, node_test_1.it)("transferência pendente: origem segue como atual e o destino aparece como pendente", () => {
        const steps = (0, custodia_1.buildCustodySteps)(lote([movement({ status: "AGUARDANDO_CONFIRMACAO", confirmado_em: null })]));
        strict_1.default.deepEqual(steps.map((s) => s.state), ["current", "pending"]);
        strict_1.default.equal(steps[1].org, "TransLog Brasil");
        strict_1.default.equal(steps[1].role, "Transporte");
        strict_1.default.equal(steps[1].type, "Aguardando confirmação");
        strict_1.default.equal(steps[1].date, "Enviado em 24 mai 2026 • 14:32");
    });
    (0, node_test_1.it)("transferência confirmada: origem concluída e destino é o responsável atual", () => {
        const hash = `0x${"ab".repeat(32)}`;
        const steps = (0, custodia_1.buildCustodySteps)(lote([movement({ tx_hash: hash })]));
        strict_1.default.deepEqual(steps.map((s) => s.state), ["done", "current"]);
        strict_1.default.equal(steps[1].date, "24 mai 2026 • 15:10");
        strict_1.default.equal(steps[1].person, "Enviado por Maria Souza");
        strict_1.default.equal(steps[1].hash, hash);
    });
    (0, node_test_1.it)("cadeia com várias etapas, ocorrência e transferência pendente", () => {
        const steps = (0, custodia_1.buildCustodySteps)(lote([
            movement({ id: 1n }),
            movement({ id: 2n, status: "COM_OCORRENCIA", usuario: roberto, participante_movimentacao_destino_idToparticipante: armazem, confirmado_em: null }),
            movement({ id: 3n, status: "AGUARDANDO_CONFIRMACAO", confirmado_em: null, participante_movimentacao_destino_idToparticipante: armazem }),
        ]));
        strict_1.default.deepEqual(steps.map((s) => s.state), ["done", "current", "issue", "pending"]);
        strict_1.default.deepEqual(steps.map((s) => s.id), ["origin", "mov-1", "mov-2", "mov-3"]);
        strict_1.default.equal(steps[2].type, "Ocorrência registrada");
        strict_1.default.equal(steps[3].role, "Recebimento e armazenagem");
    });
});
(0, node_test_1.describe)("GET /api/custodia", () => {
    (0, node_test_1.it)("exige autenticação", async () => {
        strict_1.default.equal((await request.get("/api/custodia/lotes")).status, 401);
    });
    (0, node_test_1.it)("lista os lotes visíveis para a organização (fabricou, tem ou participou)", async () => {
        const headers = login();
        db.lote.findMany.impl = async () => [lote()];
        const response = await request.get("/api/custodia/lotes").set(headers);
        strict_1.default.equal(response.status, 200);
        strict_1.default.deepEqual(response.body.lots, [{
                value: "LT-2026-0482",
                label: "LT-2026-0482 — Café Arábica Premium",
                product: "Café Arábica Premium",
                detail: "Fabricado em 18 mai 2026",
                quantity: "1200 kg",
                status: "Em transporte",
                currentOwner: "TransLog Brasil",
            }]);
        const where = db.lote.findMany.calls[0][0].where;
        strict_1.default.deepEqual(where.OR[0], { responsavel_atual_id: 1n });
        strict_1.default.deepEqual(where.OR[1], { produto: { fabricante_id: 1n } });
        strict_1.default.ok(where.OR[2].movimentacao.some.OR);
    });
    (0, node_test_1.it)("devolve a linha do tempo de um lote (código com caracteres especiais)", async () => {
        const headers = login();
        db.lote.findFirst.impl = async () => lote([movement({})], { codigo: "LT/2026 0482" });
        const response = await request.get(`/api/custodia/lotes/${encodeURIComponent("LT/2026 0482")}`).set(headers);
        strict_1.default.equal(response.status, 200);
        strict_1.default.equal(response.body.lot.value, "LT/2026 0482");
        strict_1.default.deepEqual(response.body.steps.map((s) => s.state), ["done", "current"]);
        const where = db.lote.findFirst.calls[0][0].where;
        strict_1.default.equal(where.AND[0].codigo, "LT/2026 0482");
        strict_1.default.ok(where.AND[1].OR);
    });
    (0, node_test_1.it)("404 quando o lote não existe ou não é visível para a organização", async () => {
        const headers = login(armazem);
        const response = await request.get("/api/custodia/lotes/LT-OUTRO").set(headers);
        strict_1.default.equal(response.status, 404);
    });
});
