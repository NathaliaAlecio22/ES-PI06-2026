"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const vitest_1 = require("vitest");
const app_1 = require("../src/app");
const blockchain_1 = require("../src/blockchain");
const env_1 = require("../src/config/env");
const store_1 = require("../src/store");
// Same supertest API, instrumented: every request/response of the run is also written to
// logs/api-run.log, grouped by test — the transcript of what the API actually returned.
const api_log_1 = require("./helpers/api-log");
// Pre-funded local-Hardhat accounts — used here as ordinary well-formed EVM addresses.
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PRODUCER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const CARRIER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
// keccak256("step-0") / keccak256("deliverable-1") — the on-chain bytes32 shape.
const SPECIFICATION_HASH = "0xbb459defbb15fa55f2506b3ab87d778d07e82b5bc3569d1711c27229c7b0b929";
const DELIVERABLE_HASH = "0x858629340e58d1faeb24232b139fa588ddc67f4ed71970241fc1bf18f48f65db";
const ZERO_HASH = `0x${"00".repeat(32)}`;
// Well-formed 65-byte hex that recovers to garbage — not a valid signature of anything.
const SIGNATURE = `0x${"a3".repeat(65)}`;
// Ids used by seedStore below (the in-memory mirror seeded directly, without a chain).
const WORKFLOW_ID = 1n;
const BATCH_ID = 2n;
function workflowPayload() {
    return {
        name: "Cadeia de custódia",
        adminAddress: ADMIN_ADDRESS,
        steps: [
            { name: "Origem", requiredRole: "manufacturer", assignee: PRODUCER_ADDRESS, specification: "Dados de origem e fabricação" },
            { name: "Transporte", requiredRole: "carrier", assignee: CARRIER_ADDRESS, specification: "Dados de transporte e conservação" },
        ],
    };
}
function transferPayload(overrides = {}) {
    return {
        from: PRODUCER_ADDRESS,
        to: CARRIER_ADDRESS,
        stepIndex: 0,
        deliverableHash: DELIVERABLE_HASH,
        signature: SIGNATURE,
        ...overrides,
    };
}
/**
 * Seeds the in-memory mirror directly so validation-only paths can be exercised without a
 * chain (these tests never reach a chain call, so the workflow address is just well-formed).
 */
function seedStore(status = "ACTIVE") {
    store_1.workflows.set(WORKFLOW_ID, {
        id: WORKFLOW_ID,
        organizationId: WORKFLOW_ID,
        name: "Cadeia de custódia",
        adminAddress: ADMIN_ADDRESS,
        workflowAddress: PRODUCER_ADDRESS,
        steps: [
            { name: "Origem", requiredRole: "manufacturer", assignee: PRODUCER_ADDRESS, specificationHash: SPECIFICATION_HASH },
            { name: "Transporte", requiredRole: "carrier", assignee: CARRIER_ADDRESS, specificationHash: DELIVERABLE_HASH },
        ],
        participants: [],
        createdAt: new Date().toISOString(),
    });
    store_1.batches.set(BATCH_ID, {
        id: BATCH_ID,
        workflowId: WORKFLOW_ID,
        currentCustodian: PRODUCER_ADDRESS,
        currentStepIndex: 0,
        status,
        transfers: [],
        createdAt: new Date().toISOString(),
    });
}
/**
 * The routes write to a real chain (docs/backend-api.md, "Ambiente Hardhat"). This probe
 * decides whether the integration suite below can run: it requires the configured factory
 * and signer plus a node that answers `eth_chainId` with the configured chain id — anything
 * else and the suite is skipped, so `npm test` stays green without a local node.
 */
async function probeChain() {
    if (!env_1.env.WORKFLOW_FACTORY_ADDRESS || !env_1.env.TRANSACTION_SIGNER_PRIVATE_KEY)
        return false;
    try {
        const response = await fetch(env_1.env.RPC_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
            signal: AbortSignal.timeout(2_000),
        });
        if (!response.ok)
            return false;
        const payload = (await response.json());
        return payload.result === `0x${env_1.env.CHAIN_ID.toString(16)}`;
    }
    catch {
        return false;
    }
}
(0, vitest_1.beforeEach)(() => (0, store_1.resetStore)());
// Routes whose happy paths go through the chain are covered by the suite below; this one
// stays entirely off-chain (every request stops at schema/state/signature validation).
(0, vitest_1.describe)("Provenance API (validação local)", () => {
    (0, vitest_1.it)("rejects invalid public registration data", async () => {
        const response = await (0, api_log_1.request)(app_1.app)
            .post("/api/participantes/cadastro")
            .send({
            nomeCompleto: "Ana Silva",
            email: "ana@example.com",
            senha: "senha-segura-123",
            confirmarSenha: "senha-segura-123",
            telefone: "",
            nomeOrganizacao: "Empresa Exemplo",
            cnpj: "00.000.000/0000-00",
            tipo: "Fabricante",
            cargo: "Administradora",
            aceitouTermos: true,
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.errors[0]).toMatchObject({
            field: "cnpj",
            message: "Informe um CNPJ válido.",
        });
    });
    (0, vitest_1.it)("returns health status", async () => {
        const response = await (0, api_log_1.request)(app_1.app).get("/api/health");
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toEqual({ status: "ok", service: "provenance-api" });
    });
    (0, vitest_1.it)("rejects invalid workflow data", async () => {
        const response = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send({ name: "" });
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("rejects roles outside the shared workflow-definition contract", async () => {
        const payload = workflowPayload();
        payload.steps[0].requiredRole = "producer";
        const response = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(payload);
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.details).toHaveLength(1);
    });
    (0, vitest_1.it)("rejects empty step specifications before they reach the chain", async () => {
        const payload = workflowPayload();
        payload.steps[0].specification = " ";
        const response = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(payload);
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("rejects assigning consecutive stages to the same wallet", async () => {
        const payload = workflowPayload();
        payload.steps[1].assignee = PRODUCER_ADDRESS;
        const response = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(payload);
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("rejects malformed and unknown ids", async () => {
        const malformed = await (0, api_log_1.request)(app_1.app).get("/api/workflows/0xdeadbeef");
        (0, vitest_1.expect)(malformed.status).toBe(400);
        const unknown = await (0, api_log_1.request)(app_1.app).get(`/api/workflows/${"9".repeat(77)}`);
        (0, vitest_1.expect)(unknown.status).toBe(404);
        const unknownBatch = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${"9".repeat(77)}/transfers`).send(transferPayload());
        (0, vitest_1.expect)(unknownBatch.status).toBe(404);
    });
    (0, vitest_1.it)("rejects malformed participant addresses", async () => {
        seedStore();
        const response = await (0, api_log_1.request)(app_1.app)
            .post(`/api/workflows/${WORKFLOW_ID}/participants`)
            .send({ address: "0xadmin", role: "manufacturer" });
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("rejects transfers that do not match the current custodian or step", async () => {
        seedStore();
        const response = await (0, api_log_1.request)(app_1.app)
            .post(`/api/batches/${BATCH_ID}/transfers`)
            .send(transferPayload({ from: CARRIER_ADDRESS })); // not the current custodian
        (0, vitest_1.expect)(response.status).toBe(409);
    });
    (0, vitest_1.it)("rejects transfers of a compromised batch", async () => {
        seedStore("COMPROMISED");
        const response = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${BATCH_ID}/transfers`).send(transferPayload());
        (0, vitest_1.expect)(response.status).toBe(409);
    });
    (0, vitest_1.it)("rejects signatures that cannot be recovered", async () => {
        seedStore();
        const response = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${BATCH_ID}/transfers`).send(transferPayload());
        (0, vitest_1.expect)(response.status).toBe(401);
    });
    (0, vitest_1.it)("rejects signatures made by an address other than the sender", async () => {
        seedStore();
        // A perfectly valid signature over the exact digest this request implies — made by
        // someone who is not the claimed sender.
        const digest = (0, blockchain_1.buildTransferDigest)({
            workflowAddress: PRODUCER_ADDRESS,
            chainId: env_1.env.CHAIN_ID,
            batchId: BATCH_ID,
            to: CARRIER_ADDRESS,
            deliverableHash: DELIVERABLE_HASH,
            dataHash: (0, blockchain_1.buildDataHash)({ conditionReferences: [] }),
        });
        const signature = await ethers_1.ethers.Wallet.createRandom().signMessage(ethers_1.ethers.getBytes(digest));
        const response = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${BATCH_ID}/transfers`).send(transferPayload({ signature }));
        (0, vitest_1.expect)(response.status).toBe(401);
    });
});
(0, vitest_1.describe)("Provenance API (integração on-chain)", () => {
    let chainUp = false;
    (0, vitest_1.beforeAll)(async () => {
        chainUp = await probeChain();
    });
    (0, vitest_1.beforeEach)(({ skip }) => {
        skip(!chainUp, "nó Hardhat local indisponível (docs/backend-api.md: npm run node + npm run deploy:local)");
    });
    (0, vitest_1.it)("deploys a workflow through the factory and exposes its chain address", async () => {
        const created = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(workflowPayload());
        (0, vitest_1.expect)(created.status).toBe(201);
        // JSON has no bigint: ids travel as decimal strings (see app.ts's json replacer).
        (0, vitest_1.expect)(typeof created.body.id).toBe("string");
        (0, vitest_1.expect)(created.body.id).toMatch(/^\d+$/);
        (0, vitest_1.expect)(created.body.workflowAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
        // `msg.sender` — the configured signer — becomes the on-chain admin (docs/context.md §3.5).
        const signerAddress = new ethers_1.ethers.Wallet(env_1.env.TRANSACTION_SIGNER_PRIVATE_KEY).address;
        (0, vitest_1.expect)(await (0, blockchain_1.getWorkflowAdmin)(created.body.workflowAddress)).toBe(signerAddress);
    });
    (0, vitest_1.it)("registers a participant on-chain and rejects malformed addresses", async () => {
        const workflow = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(workflowPayload());
        const participant = ethers_1.ethers.Wallet.createRandom();
        const invalid = await (0, api_log_1.request)(app_1.app)
            .post(`/api/workflows/${workflow.body.id}/participants`)
            .send({ address: "0xadmin", role: "manufacturer" });
        (0, vitest_1.expect)(invalid.status).toBe(400);
        const created = await (0, api_log_1.request)(app_1.app)
            .post(`/api/workflows/${workflow.body.id}/participants`)
            .send({ address: participant.address, role: "manufacturer" });
        (0, vitest_1.expect)(created.status).toBe(201);
        (0, vitest_1.expect)(created.body).toEqual({ address: participant.address, role: "manufacturer" });
        // The chain is the authority: read the role back from the contract.
        (0, vitest_1.expect)(await (0, blockchain_1.getParticipantRole)(workflow.body.workflowAddress, participant.address)).toBe("manufacturer");
    });
    (0, vitest_1.it)("creates a batch on-chain and refuses an unauthorized first custodian", async () => {
        const workflow = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(workflowPayload());
        const manufacturer = ethers_1.ethers.Wallet.createRandom();
        const registered = await (0, api_log_1.request)(app_1.app)
            .post(`/api/workflows/${workflow.body.id}/participants`)
            .send({ address: manufacturer.address, role: "manufacturer" });
        (0, vitest_1.expect)(registered.status).toBe(201);
        const unauthorized = await (0, api_log_1.request)(app_1.app).post("/api/batches").send({
            workflowId: workflow.body.id,
            currentCustodian: ethers_1.ethers.Wallet.createRandom().address, // never registered
        });
        (0, vitest_1.expect)(unauthorized.status).toBe(409);
        const created = await (0, api_log_1.request)(app_1.app).post("/api/batches").send({
            workflowId: workflow.body.id,
            currentCustodian: manufacturer.address,
        });
        (0, vitest_1.expect)(created.status).toBe(201);
        const state = await (0, blockchain_1.getBatchState)(workflow.body.workflowAddress, BigInt(created.body.id));
        (0, vitest_1.expect)(state.currentCustodian).toBe(manufacturer.address);
        (0, vitest_1.expect)(state.currentStepIndex).toBe(0);
        (0, vitest_1.expect)(state.status).toBe("ACTIVE");
    });
    /** Deploys a fresh two-step workflow and a batch at step 0 held by the manufacturer. */
    async function seededBatch() {
        const workflow = await (0, api_log_1.request)(app_1.app).post("/api/workflows").send(workflowPayload());
        (0, vitest_1.expect)(workflow.status).toBe(201);
        const manufacturer = ethers_1.ethers.Wallet.createRandom();
        const carrier = ethers_1.ethers.Wallet.createRandom();
        for (const participant of [
            { address: manufacturer.address, role: "manufacturer" },
            { address: carrier.address, role: "carrier" },
        ]) {
            const registered = await (0, api_log_1.request)(app_1.app)
                .post(`/api/workflows/${workflow.body.id}/participants`)
                .send(participant);
            (0, vitest_1.expect)(registered.status).toBe(201);
        }
        const batch = await (0, api_log_1.request)(app_1.app).post("/api/batches").send({
            workflowId: workflow.body.id,
            currentCustodian: manufacturer.address,
        });
        (0, vitest_1.expect)(batch.status).toBe(201);
        return { workflowAddress: workflow.body.workflowAddress, batchId: batch.body.id, manufacturer, carrier };
    }
    /** The digest the sender must sign for a transfer of `batchId` to `to` (docs/context.md §3.6). */
    function transferDigest(workflowAddress, batchId, to, dataHash) {
        return (0, blockchain_1.buildTransferDigest)({
            workflowAddress,
            chainId: env_1.env.CHAIN_ID,
            batchId: BigInt(batchId),
            to,
            deliverableHash: DELIVERABLE_HASH,
            dataHash,
        });
    }
    (0, vitest_1.it)("records a signed transfer on-chain and returns the batch history", async () => {
        const { workflowAddress, batchId, manufacturer, carrier } = await seededBatch();
        // The client signs the exact digest the contract verifies: workflow, chain id, batch,
        // recipient, deliverable hash and the data hash of the off-chain references — all
        // recomputed by the API from this same request.
        const dataHash = (0, blockchain_1.buildDataHash)({ locationReference: "Porto de Santos", conditionReferences: ["sensor-log-1"] });
        const signature = await manufacturer.signMessage(ethers_1.ethers.getBytes(transferDigest(workflowAddress, batchId, carrier.address, dataHash)));
        const transfer = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${batchId}/transfers`).send({
            from: manufacturer.address,
            to: carrier.address,
            stepIndex: 0,
            locationReference: "Porto de Santos",
            conditionReferences: ["sensor-log-1"],
            deliverableHash: DELIVERABLE_HASH,
            signature,
        });
        (0, vitest_1.expect)(transfer.status).toBe(201);
        (0, vitest_1.expect)(transfer.body.to).toBe(carrier.address);
        (0, vitest_1.expect)(transfer.body.locationReference).toBe("Porto de Santos");
        const history = await (0, api_log_1.request)(app_1.app).get(`/api/batches/${batchId}/history`);
        (0, vitest_1.expect)(history.status).toBe(200);
        (0, vitest_1.expect)(history.body.transfers).toHaveLength(1);
        (0, vitest_1.expect)(history.body.transfers[0].to).toBe(carrier.address);
        // The chain advanced the batch; the API's mirror follows the emitted event.
        const state = await (0, blockchain_1.getBatchState)(workflowAddress, BigInt(batchId));
        (0, vitest_1.expect)(state.currentCustodian).toBe(carrier.address);
        (0, vitest_1.expect)(state.currentStepIndex).toBe(1);
        // FR-05: the batch now sits on the final step of this two-step workflow.
        const atFinalStep = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${batchId}/transfers`).send({
            from: carrier.address,
            to: manufacturer.address,
            stepIndex: 1,
            deliverableHash: DELIVERABLE_HASH,
            signature: SIGNATURE,
        });
        (0, vitest_1.expect)(atFinalStep.status).toBe(409);
    });
    (0, vitest_1.it)("refuses a transfer signed by anyone but the current custodian", async () => {
        const { workflowAddress, batchId, manufacturer, carrier } = await seededBatch();
        const dataHash = (0, blockchain_1.buildDataHash)({ conditionReferences: [] });
        const signature = await ethers_1.ethers.Wallet.createRandom().signMessage(ethers_1.ethers.getBytes(transferDigest(workflowAddress, batchId, carrier.address, dataHash)));
        const response = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${batchId}/transfers`).send({
            from: manufacturer.address,
            to: carrier.address,
            stepIndex: 0,
            deliverableHash: DELIVERABLE_HASH,
            signature,
        });
        (0, vitest_1.expect)(response.status).toBe(401);
    });
    (0, vitest_1.it)("refuses a transfer to a recipient without the next step's role", async () => {
        const { workflowAddress, batchId, manufacturer } = await seededBatch();
        const intruder = ethers_1.ethers.Wallet.createRandom(); // never registered for the next step
        const dataHash = (0, blockchain_1.buildDataHash)({ conditionReferences: [] });
        const signature = await manufacturer.signMessage(ethers_1.ethers.getBytes(transferDigest(workflowAddress, batchId, intruder.address, dataHash)));
        const response = await (0, api_log_1.request)(app_1.app).post(`/api/batches/${batchId}/transfers`).send({
            from: manufacturer.address,
            to: intruder.address,
            stepIndex: 0,
            deliverableHash: DELIVERABLE_HASH,
            signature,
        });
        (0, vitest_1.expect)(response.status).toBe(409);
    });
});
