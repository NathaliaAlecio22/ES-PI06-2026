/**
 * Main flow, end to end (docs/TOFIX.md): seeded organizations -> product gate -> one
 * custody chain created by the admin organization (which holds no step) -> product and
 * lot -> custody moved step by step, only ever to the participant assigned to the next
 * step -> timeline. Real API, local Postgres, local Hardhat node; no SMTP (the seed
 * replaces the invitation flow).
 */
import { ethers } from "ethers";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { resetDatabase, seedDatabase, SEED_PASSWORD, type SeededOrganization, type SeedOrganizationKey } from "../../prisma/seed";
import { app } from "../../src/app";
import { getBatchState, getParticipantRole, getWorkflowAdmin, getWorkflowSteps } from "../../src/blockchain";
import { hardhatAccounts } from "../../src/chain/hardhat-accounts";
import { prisma } from "../../src/lib/prisma";
import { E2E_DATABASE_URL } from "./database-url";

const HARDHAT_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const LOT_CODE = "LOTE-E2E-001";

const CHAIN_STEPS = [
  { name: "Produção", key: "fabricante", requiredRole: "manufacturer", specification: "Lote produzido e embalado." },
  { name: "Transporte", key: "transportadora", requiredRole: "carrier", specification: "Transporte refrigerado até 8 ºC." },
  { name: "Distribuição", key: "distribuidor", requiredRole: "distributor", specification: "Recebimento e conferência." },
] as const;

let orgs: Record<SeedOrganizationKey, SeededOrganization>;
const tokens = {} as Record<SeedOrganizationKey, string>;
let workflowAddress: string;
let batchId: bigint;

function as(key: SeedOrganizationKey) {
  const auth = { Authorization: `Bearer ${tokens[key]}` };
  return {
    get: (path: string) => request(app).get(`/api${path}`).set(auth),
    post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set(auth).send(body),
  };
}

function chainPayload(steps: ReadonlyArray<{ name: string; key: SeedOrganizationKey; requiredRole: string; specification: string }>) {
  return {
    name: "Cadeia E2E",
    steps: steps.map(({ name, key, requiredRole, specification }) => ({
      name,
      requiredRole,
      assignee: orgs[key].wallet,
      specification,
    })),
  };
}

function transferTo(key: SeedOrganizationKey) {
  return { lot: LOT_CODE, destinationId: orgs[key].id.toString(), location: "Campinas - SP", temperature: 5, humidity: 40 };
}

async function lotRow() {
  return prisma.lote.findUniqueOrThrow({ where: { codigo: LOT_CODE } });
}

beforeAll(async () => {
  // Second guard (global-setup checks the host): never reset anything but the e2e database.
  expect(process.env.DATABASE_URL).toBe(E2E_DATABASE_URL);
  await resetDatabase(prisma);
  orgs = await seedDatabase(prisma);

  for (const key of Object.keys(orgs) as SeedOrganizationKey[]) {
    const login = await request(app).post("/api/auth/login").send({ email: orgs[key].email, senha: SEED_PASSWORD });
    expect(login.status, `login ${key}`).toBe(200);
    tokens[key] = login.body.token;
  }
});

// Tests run in declaration order and build on each other's state.
describe("Fluxo principal (e2e)", () => {
  it("dá a cada organização uma conta distinta do pool (1–19), nunca a conta 0", () => {
    const wallets = Object.values(orgs).map((org) => org.wallet.toLowerCase());
    const pool = new Set(hardhatAccounts().map((account) => account.address.toLowerCase()));

    expect(new Set(wallets).size).toBe(wallets.length);
    expect(wallets).not.toContain(HARDHAT_ACCOUNT_0.toLowerCase());
    for (const wallet of wallets) expect(pool.has(wallet)).toBe(true);
  });

  it("bloqueia o cadastro de produtos antes de existir uma cadeia", async () => {
    const status = await as("admin").get("/produtos/workflow-status");
    expect(status.status).toBe(200);
    expect(status.body.configured).toBe(false);

    const product = await as("admin").post("/produtos", {
      name: "Vacina X", code: "PRD-E2E-000", category: "Farmacêutico", lot: "LOTE-E2E-000",
      manufacturingDate: "2026-11-01", quantity: 100, unit: "caixas", location: "Fábrica - SP",
    });
    expect(product.status).toBe(409);
    expect(await prisma.produto.count()).toBe(0);
  });

  it("rejeita cadeias inválidas", async () => {
    const six = Array.from({ length: 6 }, (_, index) => ({ ...CHAIN_STEPS[0], name: `Etapa ${index + 1}` }));
    expect((await as("admin").post("/organizacao/workflow", chainPayload(six))).status).toBe(400);
    expect((await as("admin").post("/organizacao/workflow", chainPayload([CHAIN_STEPS[0]]))).status).toBe(400);

    const repeated = await as("admin").post("/organizacao/workflow", chainPayload([CHAIN_STEPS[0], { ...CHAIN_STEPS[0], name: "De novo" }]));
    expect(repeated.status).toBe(409);
    expect(repeated.body.message).toMatch(/participante diferente/);

    const wrongRole = await as("admin").post("/organizacao/workflow", chainPayload([
      CHAIN_STEPS[0],
      { ...CHAIN_STEPS[1], key: "distribuidor" },
    ]));
    expect(wrongRole.status).toBe(409);

    expect(await prisma.cadeia_custodia.count()).toBe(0);
  });

  it("cria a cadeia: a organização administra sem ocupar etapa e os participantes são registrados on-chain", async () => {
    const created = await as("admin").post("/organizacao/workflow", chainPayload(CHAIN_STEPS));
    expect(created.status).toBe(201);
    workflowAddress = created.body.workflowAddress;

    expect(await getWorkflowAdmin(workflowAddress)).toBe(orgs.admin.wallet);
    const onChainSteps = await getWorkflowSteps(workflowAddress);
    expect(onChainSteps.map((step) => step.requiredRole)).toEqual(CHAIN_STEPS.map((step) => step.requiredRole));
    for (const [index, step] of CHAIN_STEPS.entries()) {
      expect(onChainSteps[index].specificationHash).toBe(ethers.keccak256(ethers.toUtf8Bytes(step.specification)));
      expect(await getParticipantRole(workflowAddress, orgs[step.key].wallet)).toBe(step.requiredRole);
    }
    // Not assigned to any step: never registered, even with a matching role.
    expect(await getParticipantRole(workflowAddress, orgs.distribuidorReserva.wallet)).toBe("none");

    const etapas = await prisma.etapa_cadeia_custodia.findMany({ orderBy: { ordem: "asc" } });
    expect(etapas.map((etapa) => etapa.responsavel_id)).toEqual(CHAIN_STEPS.map((step) => orgs[step.key].id));

    expect((await as("admin").post("/organizacao/workflow", chainPayload(CHAIN_STEPS))).status).toBe(409);
    expect((await as("admin").get("/produtos/workflow-status")).body.configured).toBe(true);
  });

  it("cadastra o produto com o lote sob custódia do responsável pela etapa 1", async () => {
    const created = await as("admin").post("/produtos", {
      name: "Vacina X", code: "PRD-E2E-001", category: "Farmacêutico", lot: LOT_CODE,
      manufacturingDate: "2026-11-01", expirationDate: "2027-11-01", quantity: 100, unit: "caixas",
      location: "Fábrica - SP",
    });
    expect(created.status).toBe(201);

    const lot = await lotRow();
    expect(lot.responsavel_atual_id).toBe(orgs.fabricante.id);
    expect(lot.current_step_index).toBe(0);
    expect(lot.chain_batch_id).not.toBeNull();
    batchId = BigInt(lot.chain_batch_id!);

    const state = await getBatchState(workflowAddress, batchId);
    expect(state.currentCustodian).toBe(orgs.fabricante.wallet);
    expect(state.currentStepIndex).toBe(0);

    // The admin still sees the lot it registered, though it does not hold it.
    const list = await as("admin").get("/produtos");
    expect(list.body.products.map((row: { lot: string }) => row.lot)).toContain(LOT_CODE);
  });

  it("oferece como destino somente o responsável pela próxima etapa", async () => {
    const options = await as("fabricante").get("/transferencias/opcoes");
    expect(options.status).toBe(200);
    expect(options.body.lots).toHaveLength(1);
    expect(options.body.lots[0]).toMatchObject({
      code: LOT_CODE,
      nextRole: "carrier",
      nextStep: "Transporte",
      nextParticipantId: orgs.transportadora.id.toString(),
    });
    expect(options.body.participants.map((p: { id: string }) => p.id)).toEqual([orgs.transportadora.id.toString()]);
  });

  it("recusa destinos que não são o responsável pela próxima etapa", async () => {
    for (const key of ["distribuidor", "distribuidorReserva", "admin"] as const) {
      const response = await as("fabricante").post("/transferencias", transferTo(key));
      expect(response.status, key).toBe(409);
    }
    // Only the custodian can move the lot.
    expect((await as("transportadora").post("/transferencias", transferTo("distribuidor"))).status).toBe(403);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it("transfere para a etapa 2 e só o destino confirma", async () => {
    const created = await as("fabricante").post("/transferencias", transferTo("transportadora"));
    expect(created.status).toBe(201);
    expect(created.body.transfer.storageStatus).toBe("Em transporte");
    const transferId = created.body.transfer.rawId as string;

    expect((await as("distribuidor").post(`/transferencias/${transferId}/confirmar`)).status).toBe(404);

    const confirmed = await as("transportadora").post(`/transferencias/${transferId}/confirmar`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.transfer.hash).toMatch(/^0x[0-9a-f]{64}$/);

    const lot = await lotRow();
    expect(lot.responsavel_atual_id).toBe(orgs.transportadora.id);
    expect(lot.current_step_index).toBe(1);
    const state = await getBatchState(workflowAddress, batchId);
    expect(state.currentCustodian).toBe(orgs.transportadora.wallet);
    expect(state.currentStepIndex).toBe(1);
  });

  it("não aceita outro participante com o mesmo papel da próxima etapa", async () => {
    const options = await as("transportadora").get("/transferencias/opcoes");
    expect(options.body.participants.map((p: { id: string }) => p.id)).toEqual([orgs.distribuidor.id.toString()]);

    const sameRole = await as("transportadora").post("/transferencias", transferTo("distribuidorReserva"));
    expect(sameRole.status).toBe(409);
    expect(sameRole.body.message).toMatch(/responsável pela próxima etapa/);
  });

  it("uma ocorrência mantém a custódia com a origem", async () => {
    const created = await as("transportadora").post("/transferencias", transferTo("distribuidor"));
    expect(created.status).toBe(201);

    const issue = await as("distribuidor").post(`/transferencias/${created.body.transfer.rawId}/ocorrencia`, {
      notes: "Caixas avariadas na chegada.",
    });
    expect(issue.status).toBe(200);
    expect(issue.body.transfer.status).toBe("Com ocorrência");

    const lot = await lotRow();
    expect(lot.responsavel_atual_id).toBe(orgs.transportadora.id);
    expect(lot.status).toBe("ARMAZENADO");
    expect((await getBatchState(workflowAddress, batchId)).currentCustodian).toBe(orgs.transportadora.wallet);
  });

  it("conclui a cadeia na última etapa", async () => {
    const created = await as("transportadora").post("/transferencias", transferTo("distribuidor"));
    expect(created.status).toBe(201);
    const confirmed = await as("distribuidor").post(`/transferencias/${created.body.transfer.rawId}/confirmar`);
    expect(confirmed.status).toBe(200);

    const lot = await lotRow();
    expect(lot.responsavel_atual_id).toBe(orgs.distribuidor.id);
    expect(lot.current_step_index).toBe(2);
    expect((await getBatchState(workflowAddress, batchId)).currentCustodian).toBe(orgs.distribuidor.wallet);

    expect((await as("distribuidor").get("/transferencias/opcoes")).body.lots).toEqual([]);
    const beyond = await as("distribuidor").post("/transferencias", transferTo("varejista"));
    expect(beyond.status).toBe(409);
    expect(beyond.body.message).toMatch(/concluiu a cadeia/);
  });

  it("mostra a linha do tempo completa do lote", async () => {
    const timeline = await as("admin").get(`/custodia/lotes/${LOT_CODE}`);
    expect(timeline.status).toBe(200);

    const steps = timeline.body.steps as Array<{ stageName: string; state: string; org: string; hash: string | null }>;
    expect(steps.map((step) => step.stageName)).toEqual(CHAIN_STEPS.map((step) => step.name));
    expect(steps.map((step) => step.org)).toEqual(CHAIN_STEPS.map((step) => orgs[step.key].name));
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "current"]);
    expect(steps[1].hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(steps[2].hash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
