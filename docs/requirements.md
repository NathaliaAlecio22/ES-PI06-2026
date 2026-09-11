# Project Requirements

## 1. Purpose

This document converts the decisions in [`context.md`](context.md) into implementation requirements and acceptance criteria. `context.md` remains the source of truth if wording differs.

## 2. Scope

The MVP is a generic product-provenance platform where each enterprise deploys a workflow containing an ordered set of steps. Custody changes and condition breaches are independently verifiable on an Ethereum-compatible ledger, while detailed documents and application data remain off-chain.

### 2.1 MVP

- Generic workflow definition and sequence enforcement.
- Per-workflow participant authorization by blockchain address and role.
- Signed, immutable custody transfers for batches.
- Configurable condition thresholds and automatic compromise status.
- Event indexing into a rebuildable PostgreSQL mirror.
- REST API for administration, transfer submission, and history queries.
- Enterprise, operator, and audit-oriented web interfaces.
- Independent simulated sensor readings.
- Local Hardhat development and public-testnet demonstration.

### 2.2 Stretch Goals

- Zero-knowledge compliance proof generation and verification.
- High-volume sensor data stored off-chain and hash-anchored on-chain.
- Multi-sensor agreement or outlier rejection.

### 2.3 Out of Scope

- Real-world identity or KYC verification of the initial workflow admin.
- A solution to the sensor oracle problem.
- In-place versioning or migration of workflows with active batches.
- Team-operated public blockchain nodes.
- Production-grade ZK support in the MVP.

## 3. Actors

- **Workflow admin**: defines a workflow and manages authorized participants.
- **Participant/custodian**: signs and submits custody transfers when authorized for the active step.
- **Operator**: enters step deliverables and initiates approved actions through the UI.
- **Auditor/consumer**: queries a batch's provenance and condition history.
- **Sensor source**: submits condition readings associated with a batch.
- **Indexer**: consumes contract events and reconstructs the query database.

## 4. Functional Requirements

### FR-01: Participant Registration

The system shall allow only a workflow admin to bind a participant address to a role for that workflow.

Acceptance criteria:

- Participant addresses are not constructor inputs for workflow shape.
- Registration emits an indexable event.
- Unauthorized registration attempts are rejected.

### FR-02: Participant Revocation

The system shall allow only a workflow admin to revoke a participant's authorization without redeploying the workflow.

Acceptance criteria:

- Revocation emits an indexable event.
- A revoked participant cannot authorize subsequent transfers.

### FR-03: Workflow Definition

The system shall create a workflow from an ordered list of steps containing a name, required role, and hash of the full off-chain deliverable specification.

Acceptance criteria:

- The contract contains no hardcoded industry-specific sequence.
- The creator becomes the workflow admin.
- Changing step order, count, or meaning requires a new workflow deployment in the MVP.

### FR-04: Transfer Recording

The system shall record custody transfers with the batch identifier, previous and next responsible parties, timestamp, location reference, condition references, and deliverable/document hashes required for the active step.

Acceptance criteria:

- The transfer emits an event sufficient to reconstruct custody history.
- Large documents and detailed records are not stored directly on-chain.

### FR-05: Transfer Signature

Every custody transfer shall require a digital signature from its initiator.

Acceptance criteria:

- The signer is recovered cryptographically from the signed payload.
- The signed payload is unambiguous and protected from replay as specified before implementation.

### FR-06: Transfer Authorization

The recovered signer shall be both the batch's current custodian and authorized for the active step's required role.

Acceptance criteria:

- Either failed condition rejects the transfer.
- Authorization is checked against workflow contract state.

### FR-07: Sequence Enforcement

The contract shall enforce the workflow's configured step order.

Acceptance criteria:

- Steps cannot be skipped, repeated, or completed out of order.
- Rule enforcement reads the configured steps rather than branching on named roles or industries.

### FR-08: Claim Consistency

The system shall prevent concurrent or duplicate claims on the same batch state.

Acceptance criteria:

- A transfer based on stale custody or step state is rejected.
- A successfully consumed authorization cannot be replayed.

### FR-09: Compromised Batch Restriction

The system shall prevent custody movement after a batch is marked invalid or compromised.

Acceptance criteria:

- Every transfer checks current batch status before mutation.

### FR-10: Sensor Reading Submission

The system shall accept periodic condition readings associated with a batch from the sensor integration boundary.

Acceptance criteria:

- A reading identifies the batch, condition type, value, and timestamp or sequence reference.
- The sensor simulator runs independently of the API process.

### FR-11: Threshold Evaluation

The system shall evaluate configured condition thresholds and automatically flag a batch when a reading breaches a rule.

Acceptance criteria:

- A breach changes on-chain batch status.
- A breach emits an indexable event.

### FR-12: Batch History Query

The API shall return the complete indexed custody and condition history for a batch.

Acceptance criteria:

- Results preserve blockchain event order and transaction references.
- The mirror can be rebuilt from contract events without relying on previous database contents.

### FR-13: Off-chain Field Validation

The API shall validate submitted step data against the full off-chain deliverable specification before forwarding a transaction.

Acceptance criteria:

- Invalid field shape is rejected before blockchain submission.
- The validated specification hashes to the reference stored in the workflow step.

### FR-14: Application Authentication

The API shall manage user accounts, sessions, and dashboard permissions off-chain.

Acceptance criteria:

- Application authentication does not replace on-chain signature and role checks.
- Secrets and session data are never committed to source control.

### FR-15: Workflow Administration UI

The frontend shall allow an enterprise admin to define ordered steps, role requirements, and per-step required fields.

Acceptance criteria:

- The UI uses the agreed shared workflow schema.
- The UI does not assume a fixed custody process.

### FR-16: Operator and Audit UI

The frontend shall render transfer forms from workflow specifications and provide batch history lookup.

Acceptance criteria:

- Required fields are generated from the selected step specification.
- History distinguishes transfers, participant changes, readings, and breaches.

### FR-17: ZK Compliance Proof (Stretch)

The system may generate and verify a proof of compliance without revealing the underlying values.

### FR-18: Sensor Log Anchoring (Stretch)

The system may store detailed sensor logs off-chain and anchor their integrity hashes on-chain.

## 5. Non-functional Requirements

### NFR-01: Integrity

Integrity-relevant state shall be on-chain or referenced by an on-chain cryptographic hash. The database is a query mirror, not the authoritative ledger.

### NFR-02: Security

- Private keys, RPC credentials, database credentials, and session secrets shall come from ignored environment files or a secret manager.
- Administrative contract actions shall enforce caller authorization on-chain.
- Transfer signatures shall use a documented domain, payload format, nonce strategy, and chain/contract binding before implementation.
- Input validation shall occur at all external service boundaries.

### NFR-03: Auditability

All state changes needed to reconstruct participant authorization, custody, and compromise history shall emit events containing stable identifiers and transaction metadata.

### NFR-04: Performance

On-chain storage and computation shall be limited to state and rules required for consensus. Query-heavy history and full records shall be served from PostgreSQL.

### NFR-05: Reliability

- The indexer shall resume from a persisted checkpoint and tolerate duplicate event delivery.
- Indexed writes shall be idempotent by chain, transaction hash, and log index.
- Public-testnet confirmation and reorganization handling shall be defined before deployment.

### NFR-06: Portability

Applications shall support local development through documented environment variables and containerized PostgreSQL. Blockchain integration shall target Ethereum-compatible JSON-RPC.

### NFR-07: Testability

- Smart-contract rules shall have isolated automated tests.
- API validation and indexing shall have integration tests.
- Core workflow, transfer, breach, and history paths shall have end-to-end tests.
- Local Hardhat execution shall be described as EVM simulation, not distributed consensus.

### NFR-08: Accessibility and Responsiveness

The web interface shall support keyboard navigation, meaningful labels, sufficient contrast, and current desktop and mobile viewport sizes.

### NFR-09: Observability

Services shall produce structured logs with correlation identifiers and blockchain transaction references while excluding credentials and private data.

## 6. Required Data Boundaries

### 6.1 Structured On-chain Data

- Workflow admin address.
- Ordered workflow steps: name, required role, deliverable specification hash.
- Participant address-to-role authorization.
- Current batch custody, step, and compromise state.
- Events needed to reconstruct history.

### 6.2 Hash-only On-chain References

- Full deliverable specifications.
- Certificates and documents.
- Detailed sensor logs.

### 6.3 Off-chain Data

- Full referenced content.
- Indexed event mirror and checkpoints.
- User accounts and login sessions.
- Dashboard UI state.

## 7. Environment Requirements

### Local Development

- Node.js and package manager versions shall be pinned when implementation begins.
- Hardhat local network is the default EVM environment.
- PostgreSQL runs as a separate local service/container.
- API/indexer, frontend, and sensor simulator run as separate processes.

### Demonstration

- Deploy to the currently recommended Ethereum public testnet.
- Confirm the testnet choice against current Ethereum Foundation guidance before each milestone deployment.
- Use hosted JSON-RPC access unless self-hosting has a documented need.

## 8. Definition of Done for MVP

- FR-01 through FR-16 are implemented and verified.
- A complete batch lifecycle can be demonstrated locally and on a public testnet.
- Invalid role, signer, sequence, duplicate, and compromised-batch transfers are rejected.
- A threshold breach automatically compromises a batch and blocks later movement.
- PostgreSQL can be cleared and rebuilt from blockchain events.
- No credentials or private keys are tracked by Git.
- Accepted limitations are stated in project and presentation documentation.

## 9. Decisions Required Before Implementation

- Exact shared workflow-definition and deliverable-specification schema.
- Initial role representation and whether roles are fixed enum values or workflow-scoped identifiers.
- Signed transfer payload, domain separation, nonce, and replay-protection design.
- Batch creation and initial-custodian rules.
- Sensor authorization and threshold configuration model.
- API framework, database migration tool, package manager, and monorepo tooling.
- Confirmation and chain-reorganization policy for the indexer.
