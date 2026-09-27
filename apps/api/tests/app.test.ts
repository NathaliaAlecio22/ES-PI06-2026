import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { resetStore } from "../src/store";

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

    const created = await request(app).post("/api/workflows").send({
      name: "Cadeia de custódia",
      adminAddress: "0xadmin",
      steps: [{ name: "Origem", requiredRole: "producer", specificationHash: "hash-1" }],
    });

    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Cadeia de custódia");
  });

  it("records a transfer and returns batch history", async () => {
    const workflow = await request(app).post("/api/workflows").send({
      name: "Cadeia de custódia",
      adminAddress: "0xadmin",
      steps: [{ name: "Origem", requiredRole: "producer", specificationHash: "hash-1" }],
    });
    const batch = await request(app).post("/api/batches").send({
      workflowId: workflow.body.id,
      currentCustodian: "0xproducer",
    });

    const transfer = await request(app).post(`/api/batches/${batch.body.id}/transfers`).send({
      from: "0xproducer",
      to: "0xcarrier",
      stepIndex: 0,
      deliverableHash: "deliverable-1",
      signature: "signature-1",
    });

    expect(transfer.status).toBe(201);
    const history = await request(app).get(`/api/batches/${batch.body.id}/history`);
    expect(history.status).toBe(200);
    expect(history.body.transfers).toHaveLength(1);
  });
});