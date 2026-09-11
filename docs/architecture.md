# Architecture Boundaries

## Components

| Component | Responsibility | Authoritative data |
| --- | --- | --- |
| Workflow contracts | Workflow shape, role authorization, batch state, rule enforcement, events | Consensus-critical state |
| API and indexer | REST boundary, schema validation, transaction forwarding, event indexing | No blockchain history authority |
| PostgreSQL | Query mirror, full referenced records, accounts and sessions | Off-chain content and application data only |
| Frontend | Workflow administration, operator forms, history views | No authoritative state |
| Sensor simulator | Independent mock condition source | Simulated readings before submission |
| ZK prover | Optional isolated proof generation | Proof artifacts only |

## Intended Data Flow

1. An admin defines an ordered workflow and stores its full deliverable specifications off-chain.
2. Their hashes and step role requirements are used to create a workflow contract.
3. The admin separately registers participant addresses and roles.
4. The frontend renders operator fields from the off-chain specification.
5. The API validates submitted fields, prepares or forwards the signed transaction, and waits for a receipt.
6. Contracts enforce sequence, signer, role, custodian, and batch-status rules.
7. Events are indexed into PostgreSQL for efficient history queries.
8. The sensor simulator submits readings through its separately defined trust boundary.

## Repository Mapping

- `contracts/`: Solidity source, tests, deployment scripts, and generated ABI output configuration.
- `apps/api/`: API and indexer in one deployable process.
- `apps/frontend/`: Static React and TypeScript web application.
- `apps/sensor-simulator/`: Standalone simulated device process.
- `packages/shared/`: Versioned API DTOs, workflow schemas, and shared identifiers.
- `infra/`: Container and deployment definitions; no application source.
- `tests/`: Tests spanning more than one component.
- `zk/`: Stretch-goal research isolated from the MVP runtime.

## Constraints

- No team-operated blockchain node is part of the target deployment.
- PostgreSQL must be rebuildable from emitted events for on-chain history.
- Participant identity must not be embedded in workflow construction.
- Field-level deliverable validation remains off-chain.
- Workflow shape is immutable for the MVP.
