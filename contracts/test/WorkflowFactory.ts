import { anyUint } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// Role enum values must match `Role` in apps/api/src/blockchain.ts (docs/context.md §7).
const Role = {
  None: 0,
  Manufacturer: 1,
  Distributor: 2,
  Carrier: 3,
  DistributionCenter: 4,
  Retailer: 5,
  Admin: 6,
};

async function buildTransferSignature(params: {
  signer: import("ethers").Signer;
  workflowAddress: string;
  chainId: bigint;
  batchId: bigint;
  to: string;
  deliverableHash: string;
  dataHash: string;
}) {
  const digest = ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "address", "bytes32", "bytes32"],
    [params.workflowAddress, params.chainId, params.batchId, params.to, params.deliverableHash, params.dataHash],
  );
  return params.signer.signMessage(ethers.getBytes(digest));
}

describe("WorkflowFactory + Workflow (end to end)", function () {
  it("deploys a workflow via the factory with msg.sender as admin", async function () {
    const [admin] = await ethers.getSigners();
    const factory = await ethers.deployContract("WorkflowFactory");

    const steps = [{ name: "Origin", requiredRole: Role.Manufacturer, deliverableHash: ethers.id("step-0") }];

    const tx = await factory.createWorkflow(steps);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((log) => factory.interface.parseLog(log))
      .find((parsed) => parsed?.name === "WorkflowCreated")!;

    const workflow = await ethers.getContractAt("Workflow", event.args.workflow as string);
    expect(await workflow.admin()).to.equal(admin.address);
    expect(event.args.admin).to.equal(admin.address);
  });

  it("drives a batch through registration, custody transfer, and a condition breach", async function () {
    const [admin, manufacturer, distributor] = await ethers.getSigners();
    const network_ = await ethers.provider.getNetwork();

    const factory = await ethers.deployContract("WorkflowFactory");
    const steps = [
      { name: "Origin", requiredRole: Role.Manufacturer, deliverableHash: ethers.id("step-0") },
      { name: "Distribution", requiredRole: Role.Distributor, deliverableHash: ethers.id("step-1") },
    ];
    const createTx = await factory.createWorkflow(steps);
    const createReceipt = await createTx.wait();
    const workflowAddress = createReceipt!.logs
      .map((log) => factory.interface.parseLog(log))
      .find((parsed) => parsed?.name === "WorkflowCreated")!.args.workflow as string;

    const workflow = await ethers.getContractAt("Workflow", workflowAddress);

    await (await workflow.registerParticipant(manufacturer.address, Role.Manufacturer)).wait();
    await (await workflow.registerParticipant(distributor.address, Role.Distributor)).wait();

    const batchId = 1n;
    await (await workflow.createBatch(batchId, manufacturer.address)).wait();

    const batchAfterCreate = await workflow.batches(batchId);
    expect(batchAfterCreate.currentCustodian).to.equal(manufacturer.address);
    expect(batchAfterCreate.currentStepIndex).to.equal(0n);

    const deliverableHash = ethers.id("deliverable-1");
    const dataHash = ethers.id("data-1");
    const signature = await buildTransferSignature({
      signer: manufacturer,
      workflowAddress,
      chainId: network_.chainId,
      batchId,
      to: distributor.address,
      deliverableHash,
      dataHash,
    });

    await expect(workflow.transferCustody(batchId, distributor.address, deliverableHash, dataHash, signature))
      .to.emit(workflow, "CustodyTransferred")
      .withArgs(batchId, manufacturer.address, distributor.address, 1n, deliverableHash, dataHash, anyUint);

    const batchAfterTransfer = await workflow.batches(batchId);
    expect(batchAfterTransfer.currentCustodian).to.equal(distributor.address);
    expect(batchAfterTransfer.currentStepIndex).to.equal(1n);

    await expect(workflow.reportCondition(batchId, ethers.id("temperature_celsius"), 30n, 8n, Math.floor(Date.now() / 1000)))
      .to.emit(workflow, "BatchCompromised")
      .withArgs(batchId, "condition threshold breached");

    const batchAfterBreach = await workflow.batches(batchId);
    expect(batchAfterBreach.status).to.equal(1n); // BatchStatus.Compromised
  });

  it("rejects a transfer signed by someone other than the current custodian", async function () {
    const [, manufacturer, distributor, stranger] = await ethers.getSigners();
    const network_ = await ethers.provider.getNetwork();

    const factory = await ethers.deployContract("WorkflowFactory");
    const steps = [
      { name: "Origin", requiredRole: Role.Manufacturer, deliverableHash: ethers.id("step-0") },
      { name: "Distribution", requiredRole: Role.Distributor, deliverableHash: ethers.id("step-1") },
    ];
    const createReceipt = await (await factory.createWorkflow(steps)).wait();
    const workflowAddress = createReceipt!.logs
      .map((log) => factory.interface.parseLog(log))
      .find((parsed) => parsed?.name === "WorkflowCreated")!.args.workflow as string;
    const workflow = await ethers.getContractAt("Workflow", workflowAddress);

    await (await workflow.registerParticipant(manufacturer.address, Role.Manufacturer)).wait();
    await (await workflow.registerParticipant(distributor.address, Role.Distributor)).wait();
    await (await workflow.createBatch(1n, manufacturer.address)).wait();

    const deliverableHash = ethers.id("deliverable-1");
    const dataHash = ethers.id("data-1");
    const signature = await buildTransferSignature({
      signer: stranger,
      workflowAddress,
      chainId: network_.chainId,
      batchId: 1n,
      to: distributor.address,
      deliverableHash,
      dataHash,
    });

    await expect(
      workflow.transferCustody(1n, distributor.address, deliverableHash, dataHash, signature),
    ).to.be.revertedWith("Workflow: signer is not the current custodian");
  });
});
