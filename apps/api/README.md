# API and Indexer

Planned single Node.js/TypeScript process responsible for REST endpoints, off-chain workflow-schema validation, blockchain transaction integration, event indexing, authentication, and PostgreSQL access.

Do not split API and indexer into separate deployables without a concrete scaling requirement. No implementation or framework has been selected yet.

Suggested future layout:

```text
src/
  api/
  blockchain/
  config/
  database/
  indexer/
  modules/
tests/
```
