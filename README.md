# Blockchain Product Provenance Tracker

Generic, Ethereum-compatible product provenance platform based on enterprise-defined custody workflows.

The repository contains the project documentation and the initial backend API foundation. Product implementation is being developed incrementally.

## Documentation

- [`docs/context.md`](docs/context.md): source of truth for architecture and intent.
- [`docs/requirements.md`](docs/requirements.md): scoped and testable project requirements.
- [`docs/architecture.md`](docs/architecture.md): component boundaries and data ownership.
- [`docs/backend-api.md`](docs/backend-api.md): implemented backend API, endpoints, setup, and next steps.
- [`docs/poc-checklist.md`](docs/poc-checklist.md): PoC checklist — what's done vs. still needed, verified against the code.
- [`docs/consolidation-followup.md`](docs/consolidation-followup.md): Consolidation follow-up — what was completed, what is partial, what remains.

## Repository Structure

```text
apps/
  api/                 API and blockchain event indexer
  frontend/            React web application
  sensor-simulator/    Independent simulated sensor service (dropped, see note below)
contracts/             Solidity contracts and deployment tooling
packages/
  shared/              Cross-application types and schemas
docs/                  Project context and specifications
tests/
  integration/         Cross-component integration tests
  e2e/                 End-to-end tests
zk/                    Optional zero-knowledge proof research (dropped, see note below)
```

Each component directory contains a README describing its intended responsibility. Toolchain manifests and source files should be added only when implementation begins and the team has agreed on the shared workflow-definition shape.

> **Note:** the standalone sensor simulator (`apps/sensor-simulator/`) was dropped for lack of
> time and was never implemented as its own process. Sensor/condition support itself is not
> missing, though — it's already implemented in the contracts and backend (see
> [`apps/sensor-simulator/README.md`](apps/sensor-simulator/README.md) and
> [`docs/backend-api.md`](docs/backend-api.md)).

> **Note:** the `infra/` directory and its dedicated branch were dropped. The project now uses
> [Supabase](https://supabase.com) as a hosted Postgres/backend-as-a-service provider instead of
> a self-hosted, Docker-composed PostgreSQL container, so the planned container/deployment
> definitions are no longer needed.

> **Note:** the zero-knowledge stretch goal (`zk/`) was dropped for lack of time. See
> [`zk/README.md`](zk/README.md) for details.
