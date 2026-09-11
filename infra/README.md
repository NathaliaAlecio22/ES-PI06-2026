# Infrastructure

Docker infrastructure for local development and future deployment definitions for team-owned services.

The team does not deploy a blockchain node for public-testnet environments. Local Hardhat is development infrastructure only and will be added to the container stack after the contracts workspace exists.

## Current Stack

- PostgreSQL 17 for indexed blockchain history, off-chain records, accounts, and sessions.
- A named Docker volume for database persistence.
- A private bridge network reserved for future project services.

Application containers are intentionally deferred until their package manifests, build commands, and runtime choices exist.

## Local Usage

Run commands from the repository root:

```bash
docker compose --env-file infra/docker/.env.example -f infra/docker/compose.yaml up -d
docker compose -f infra/docker/compose.yaml ps
docker compose -f infra/docker/compose.yaml down
```

For custom local values, create `infra/docker/.env` from `.env.example` and use it instead. The `.env` file is ignored by Git.

To remove the database volume as well:

```bash
docker compose -f infra/docker/compose.yaml down -v
```

## Layout

```text
docker/
  .env.example
  compose.yaml
deploy/
```

The `deploy/` directory will be introduced when a deployment target is selected.
