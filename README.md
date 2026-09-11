# Blockchain Product Provenance Tracker

Generic, Ethereum-compatible product provenance platform based on enterprise-defined custody workflows.

This repository currently contains project documentation and structural boilerplate only. Product implementation has not started.

## Documentation

- [`docs/context.md`](docs/context.md): source of truth for architecture and intent.
- [`docs/requirements.md`](docs/requirements.md): scoped and testable project requirements.
- [`docs/architecture.md`](docs/architecture.md): component boundaries and data ownership.

## Repository Structure

```text
apps/
  api/                 API and blockchain event indexer
  frontend/            React web application
  sensor-simulator/    Independent simulated sensor service
contracts/             Solidity contracts and deployment tooling
packages/
  shared/              Cross-application types and schemas
infra/                 Local and deployment infrastructure definitions
docs/                  Project context and specifications
tests/
  integration/         Cross-component integration tests
  e2e/                 End-to-end tests
zk/                    Optional zero-knowledge proof research
```

Each component directory contains a README describing its intended responsibility. Toolchain manifests and source files should be added only when implementation begins and the team has agreed on the shared workflow-definition shape.
