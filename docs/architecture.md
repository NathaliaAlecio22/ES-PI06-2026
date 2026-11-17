# Architecture Boundaries

## Components

| Component | Responsibility | Authoritative data |
| --- | --- | --- |
| Workflow contracts | Workflow shape, role authorization, batch state, rule enforcement, events | Consensus-critical state |
| API and indexer | REST boundary, schema validation, transaction forwarding, event indexing | No blockchain history authority |
| PostgreSQL (via Supabase) | Query mirror, full referenced records, accounts and sessions | Off-chain content and application data only |
| Frontend | Workflow administration, operator forms, history views | No authoritative state |
| Sensor simulator (dropped) | Independent mock condition source | Simulated readings before submission |
| ZK prover (dropped) | Optional isolated proof generation | Proof artifacts only |

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
- `apps/sensor-simulator/`: Standalone simulated device process (dropped, see addendum below).
- `packages/shared/`: Versioned API DTOs, workflow schemas, and shared identifiers.
- `tests/`: Tests spanning more than one component.
- `zk/`: Stretch-goal research isolated from the MVP runtime (dropped, see addendum below).

## Constraints

- No team-operated blockchain node is part of the target deployment.
- PostgreSQL must be rebuildable from emitted events for on-chain history.
- Participant identity must not be embedded in workflow construction.
- Field-level deliverable validation remains off-chain.
- Workflow shape is immutable for the MVP.

## Addendum: sensor simulator dropped for lack of time

The standalone sensor simulator (`apps/sensor-simulator/`) described above was **not built** —
there was no time left in the schedule to implement it as its own process. The directory
remains a planning stub only.

Condition/sensor support itself is not missing, though: it is already implemented at the
contract and backend layers. The `Workflow` contract's `reportCondition` function and the
`apps/api/src/blockchain.ts` functions `reportCondition`/`getConditionBreaches` (plus the
`ConditionReported` event listener) exist and work; see
[`backend-api.md`](backend-api.md) for details. Only the external-device process and its REST
route in `apps/api/src/app.ts` are missing.

## Addendum: infra/ dropped in favor of Supabase

The `infra/` directory (planned Docker/deployment definitions for a self-hosted PostgreSQL
container) and its dedicated git branch were dropped. The project now uses
[Supabase](https://supabase.com) as a hosted Postgres/backend-as-a-service provider, so a
team-managed container/deployment folder is no longer part of the architecture. PostgreSQL
remains the query-mirror engine of choice (see the components table above); it is just
provisioned and hosted by Supabase instead of a local Docker Compose stack.

## Addendum: ZK prover dropped for lack of time

The optional zero-knowledge prover (`zk/`) was dropped for lack of time and was never
implemented. See [`zk/README.md`](../zk/README.md).
