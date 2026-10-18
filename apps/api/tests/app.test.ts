import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { app } from "../src/app";
import { resetStore } from "../src/store";

// Pre-funded local-Hardhat accounts — used here as ordinary well-formed EVM addresses.
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PRODUCER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const CARRIER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

// keccak256("step-0") / keccak256("deliverable-1") — the on-chain bytes32 shape.
const SPECIFICATION_HASH = "0xbb459defbb15fa55f2506b3ab87d778d07e82b5bc3569d1711c27229c7b0b929";
const DELIVERABLE_HASH = "0x858629340e58d1faeb24232b139fa588ddc67f4ed71970241fc1bf18f48f65db";
const SIGNATURE = `0x${"a3".repeat(65)}`;

function workflowPayload() {
  return {
    name: "Cadeia de custódia",
    adminAddress: ADMIN_ADDRESS,
    steps: [
      { name: "Origem", requiredRole: "manufacturer", specificationHash: SPECIFICATION_HASH },
      { name: "Transporte", requiredRole: "carrier", specificationHash: DELIVERABLE_HASH },
    ],
  };
}

beforeEach(() => resetStore());

describe("Provenance API", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "provenance-api" });
  });

  it("creates a workflow and rejects invalid data", async () => {
    const invalid = await request(app).post("/api/workflows").send({ name: "" });
    expect(invalid.status).toBe(400);

    const created = await request(app).post("/api/workflows").send(workflowPayload());

    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Cadeia de custódia");
    expect(created.body.steps[0].requiredRole).toBe("manufacturer");
  });

  it("rejects roles outside the shared workflow-definition contract", async () => {
    const payload = workflowPayload();
    payload.steps[0].requiredRole = "producer";

    const response = await request(app).post("/api/workflows").send(payload);

    expect(response.status).toBe(400);
    expect(response.body.details).toHaveLength(1);
  });

  it("registers a participant and rejects malformed addresses", async () => {
    const workflow = await request(app).post("/api/workflows").send(workflowPayload());

    const invalid = await request(app)
      .post(`/api/workflows/${workflow.body.id}/participants`)
      .send({ address: "0xadmin", role: "manufacturer" });
    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post(`/api/workflows/${workflow.body.id}/participants`)
      .send({ address: PRODUCER_ADDRESS, role: "manufacturer" });

    expect(created.status).toBe(201);
    expect(created.body).toEqual({ address: PRODUCER_ADDRESS, role: "manufacturer" });
  });

  it("records a transfer and returns batch history", async () => {
    const workflow = await request(app).post("/api/workflows").send(workflowPayload());
    const batch = await request(app).post("/api/batches").send({
      workflowId: workflow.body.id,
      currentCustodian: PRODUCER_ADDRESS,
    });

    const transfer = await request(app).post(`/api/batches/${batch.body.id}/transfers`).send({
      from: PRODUCER_ADDRESS,
      to: CARRIER_ADDRESS,
      stepIndex: 0,
      deliverableHash: DELIVERABLE_HASH,
      signature: SIGNATURE,
    });

    expect(transfer.status).toBe(201);
    const history = await request(app).get(`/api/batches/${batch.body.id}/history`);
    expect(history.status).toBe(200);
    expect(history.body.transfers).toHaveLength(1);
    expect(history.body.transfers[0].to).toBe(CARRIER_ADDRESS);
  });
});
