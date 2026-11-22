# Consolidation Follow-Up

Status document for the consolidation effort described in
[`docs/poc-checklist.md`](poc-checklist.md). The implementation was interrupted after
Phase 2 (plus partial Phase 3 scaffolding) due to budget constraints. This document
captures what was completed, what is partially done, and what remains, so work can resume
without re-discovering the state of the codebase.

## What was done

### Phase 0 — Foundation fixes (committed as `3219db2`)

- Fixed the `/api/worflows` typo in `apps/api/src/app.ts` that silently defeated the
  auth middleware on all workflow routes while accidentally gating the read-only batch
  history lookup. Replaced with method-aware gates: mutating routes require auth, reads
  stay public for the auditor/consumer actor.
- Restored the `npm test` script in `apps/api/package.json` (removed two revisions earlier).
- Added `JWT_SECRET`, `RESET_CODE_SECRET`, `DIRECT_URL`, `CORS_ORIGIN`, `SMTP_*`,
  `FRONTEND_URL`, `TEMPERATURE_THRESHOLD_C`, `HUMIDITY_THRESHOLD_PCT` to `config/env.ts`
  (validated schema) and `.env.example`. `jwt.ts`, `auth.ts`, `email.service.ts`, and
  `organizacao.ts` now read from the validated `env` module instead of raw `process.env`.
- Consolidated three copies of `loadCurrentUser`/`roleFromProfile` into `utils/session.ts`;
  `produtos.ts` and `organizacao.ts` import from there. Fixed `organizacao.ts`'s missing
  `user.ativo` check.
- Deleted the shadowed `GET /api/auth/me` in `routes/user.ts` (dead code, unreachable).
- Deleted stray `apps/package.json` and `apps/package-lock.json`.
- `app.test.ts`: mutating requests now carry a Bearer token; added a regression test
  asserting unauthenticated mutations are rejected while reads stay public.
- **Result:** 14 passed, 6 skipped (3 previously-failing tests fixed).

### Phase 1 — Multi-signer foundation (committed as `933043b`)

- Created `src/chain/hardhat-accounts.ts`: the 10 standard, publicly documented Hardhat
  local accounts, derived at runtime from the standard development mnemonic (no hardcoded
  keys to drift). First-free allocation caps the PoC at 10 simultaneously registered
  organizations, with a dedicated `NoChainAccountAvailableError` for the 11th.
- Extended `blockchain.ts`: every write function (`createWorkflow`, `registerParticipant`,
  `revokeParticipant`, `createBatch`, `transferCustody`, `reportCondition`) accepts an
  optional `signerPrivateKey` — the per-organization custodial signer — and falls back to
  the configured global signer when omitted. Signers are cached per key for correct nonce
  handling on a local node.
- Created `src/chain/org-chain.ts`: the service layer binding Postgres participants to
  chain identity — `tipo` → chain role mapping, deterministic deliverable/spec descriptor
  hashing (keccak256 of JSON), workflow-step building (step 0 = the org's own role,
  followed by admin-chosen participant types or documented defaults), workflow deployment
  + self-registration, and lazy destination registration (`ensureParticipantRegistered`).

### Phase 2 — Per-organization on-chain workflow at signup (committed as `7b86e0a`)

- Prisma schema + migration `20261122160000`: `participante` gains `workflow_address` +
  `workflow_steps`; `lote` gains `chain_batch_id` (uint256 mirror, unique) +
  `current_step_index`.
- `POST /api/participantes/cadastro` now: pre-checks e-mail/CNPJ uniqueness, allocates the
  next free Hardhat account, deploys the org's own `Workflow` contract (org becomes its
  own admin; registers itself for step 0's role), then persists everything in one
  transaction. Chain failures return 502 with revert/transport detail.
- `registerSchema` accepts `workflowSteps` (up to 3 subsequent participant types); skipped
  steps fall back to the default chain (Distribuidor → Transportadora → Varejista).
- **Result:** 14 passed, 6 skipped (unchanged — signup validation test only exercises
  schema rejection, before any chain or database access).

### Partial Phase 3 scaffolding (committed as `0e25151`)

- `ensureWorkflowForParticipante`: lazily deploys a default workflow for orgs predating
  the consolidation, returning `workflowAddress`/`steps`/`signerKey`.
- `readStoredSteps`: parses stored `workflow_steps` JSON back into typed steps.
- `reportConditions`: reports temperature/humidity readings on-chain (FR-10/FR-11) using
  fixed-point ×100 representation and env-configured thresholds.
- Constants: `TEMPERATURE_CONDITION_KEY`, `HUMIDITY_CONDITION_KEY`, `toFixedPoint`.

## What still needs to be done

### Phase 3 — Wire `produtos.ts` and `transferencias.ts` to the chain (NOT started)

This is the heart of the consolidation. The helper scaffolding exists in `org-chain.ts`
but no route consumes it yet.

**`produtos.ts` `POST /`:**
1. After creating product+lot rows in Postgres, call `ensureWorkflowForParticipante` on
   the org's `participante` row (lazy-deploys a default workflow for legacy orgs).
2. Mint a `batchId` via `createId()` from `store.ts` (keccak256 of UUID — same shape as
   the contract's `uint256 batchId`).
3. Call `createBatch(workflowAddress, batchId, org.wallet_address, orgSignerKey(...))`.
4. Persist `chain_batch_id` + `current_step_index = 0` on the `lote` row.
5. On chain failure: return 502 with revert reason; the Postgres rows may already exist
   (accepted trade-off, documented).

**`transferencias.ts` `POST /` (create pending transfer):**
1. Require `lote.chain_batch_id` to be non-null (else 409 — lot not yet on-chain).
2. Look up the org's `workflow_steps` (via `readStoredSteps`).
3. Compute `currentStep = lote.current_step_index`; if `currentStep + 1 >= steps.length`,
   return 409 "lote concluiu o workflow".
4. Validate the destination org's `tipo` maps to `steps[currentStep + 1].requiredRole`
   (via `chainRoleForTipo`); else 409 with a clear message.
5. Keep the existing pending/claim logic (atomic `updateMany` on `lote.status`).

**`transferencias.ts` `POST /:id/confirmar` (the moment `transferCustody` fires):**
1. Pre-checks: movement exists, `destino_id == caller`, status PENDING.
2. Ensure the destination org is registered in the origin org's workflow for the
   next step's role (call `ensureParticipantRegistered` with the origin's admin key).
3. Build the transfer digest (`buildTransferDigest` from `blockchain.ts`) and sign it
   with the **origin** org's wallet (the current custodian — the chain requires the
   current custodian's signature).
4. Call `transferCustody(workflowAddress, params, originSignerKey)`.
5. On success: update `movimentacao` with `tx_hash`, `status_blockchain = "CONFIRMADA"`;
   update `lote.current_step_index` from the chain event's `stepIndex`; set
   `lote.status = "ARMAZENADO"` and `responsavel_atual_id = destination`.
6. If temperature/humidity present: call `reportConditions` (from `org-chain.ts`) with
   the origin org's signer key. If any reading breaches threshold, set
   `lote.status = "COM_OCORRENCIA"` (the chain auto-compromises the batch).
7. On chain failure after the claim: return 502; the DB row stays in its pre-chain state
   (accepted inline-mirror trade-off, documented).

**`transferencias.ts` `/opcoes` endpoint:**
- Include `nextRole` per lot (from `workflow_steps[current_step + 1]`).
- Filter participants to those whose `chainRoleForTipo(tipo)` matches the lot's next role.
- Only return lots that have `chain_batch_id` and a transferable next step.

**New route file `src/routes/condicoes.ts` (FR-10/FR-11):**
- `POST /api/lotes/:codigo/condicoes` (auth): report a condition reading on-chain for
  the lot's batch. Requires the caller to be the current custodian org. Calls
  `reportCondition` with the org's signer key; records in `registro_condicao`; on
  breach sets `lote.status = "COM_OCORRENCIA"`.
- `GET /api/lotes/:codigo/condicoes` (auth): returns `getConditionBreaches` for the
  lot's batch.
- Mount in `app.ts`.

**`app.ts` cleanup:**
- Remove now-unused imports (`getConditionBreaches`, `reportCondition` if moved to the
  condicoes route).
- Mount `condicoesRouter`.

### Phase 4 — Frontend (NOT started)

1. **Workflow setup UI in `Cadastro.tsx`**: add a fieldset for the custody chain — up to 3
   dropdowns of participant types (same vocabulary as the "tipo" field). Send
   `workflowSteps` in the registration payload. The backend already accepts this field.
2. **Transfer UI**: `toTransfer` in `services/transferencias.ts` already maps `hash` from
   `row.tx_hash ?? "Pendente"` — once the backend writes real tx hashes, the UI will
   display them without frontend changes. Verify the display styling.
3. **Move local Zod schemas into `@provenance/shared`**: `produtos.ts`, `transferencias.ts`,
   `organizacao.ts`, `auth.ts`, `participantes.ts` all define their own schemas instead
   of reusing shared ones. Create new shared modules (`auth.ts`, `produtos.ts`,
   `transferencias.ts`, `organizacao.ts`) and update both API routes and frontend service
   types to import from `@provenance/shared`. Frontend uses `import type` (type-only,
   erased at compile time) to avoid needing a shared build step.
4. **`apps/frontend/README.md`**: update — it still says "no implementation or frontend
   toolchain has been selected yet" despite `TraceBlock/` being a fully scaffolded Vite/React app.

### Phase 5 — Tests (NOT started)

1. Fix remaining test issues: `app.test.ts` chain integration tests need Bearer tokens
   (already added in Phase 0 for the local-validation suite; the on-chain suite may need
   the same treatment for any new org-scoped routes).
2. Add tests for the consolidated flow:
   - `produtos` → `createBatch` (chain + Postgres mirror).
   - `transferencias` create → confirm → `transferCustody` + `tx_hash` persistence.
   - Conditions reporting + breach → `COM_OCORRENCIA` status.
   - Multi-signer assignment (first-free allocation, 11th org rejection).
   - Workflow-at-signup (lazy default deploy).
3. Gate DB-dependent tests behind an opt-in env flag (e.g. `RUN_DB_TESTS=1`) so `npm test`
   stays green without external services.
4. Unit tests for pure helpers: `chainRoleForTipo`, `buildWorkflowSteps`,
   `specificationHashForStep`, `deliverableHashForTransfer`, `toFixedPoint`,
   `allocateChainAccount`.

### Phase 6 — Testnet + documentation (NOT started)

1. Deploy `WorkflowFactory` to Sepolia and verify on Etherscan (scripts exist:
   `npm run deploy:sepolia`, `npx hardhat verify`). Requires a funded Sepolia account
   (`SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY`).
2. Final documentation pass: update `docs/requirements.md`, `docs/context.md`,
   `docs/architecture.md`, `docs/backend-api.md`, and `docs/poc-checklist.md` to describe
   the consolidated architecture (custodial per-org Hardhat signer model, per-org workflows
   created at signup, minimal FR-13 scope, 10-org cap, inline mirror, `acordo_entrega`
   descoped to no file upload) as accepted, documented decisions rather than deviations.
3. Update `docs/poc-checklist.md` to reflect the new status of each requirement.

## Key decisions made during consolidation

| Decision | Choice | Rationale |
|---|---|---|
| Signing model | Custodial: each org gets one of 10 Hardhat test accounts; the API signs on-chain transactions on the org's behalf | Real wallet integration (MetaMask) is too much frontend work for the PoC; a single shared signer loses per-actor traceability. Capped at 10 orgs (the 10 Hardhat accounts). |
| Workflow model | Each organization creates its own Workflow contract at signup | Matches FR-15 as documented; avoids reintroducing the "hardcoded process" the docs warned against. |
| Cross-org transfers | Destination org auto-registered into the origin's workflow (signed by origin's admin key) on first transfer, filtered by role match | Avoids a manual invite/approval step; the `/opcoes` endpoint validates role compatibility at transfer creation time. |
| Chain-mirror depth | Inline update: each write route awaits the tx receipt and writes `tx_hash`/status into the same Postgres row in the same request | No background indexer needed; doesn't tolerate the API being down when an event is emitted by another path, but acceptable for the PoC. |
| Field validation (FR-13) | Minimal: steps carry name/role/document-hash only | The "deliverable specification" is an opaque document the org hashes, not a structured form. Full field-level validation deferred. |
| Workflow builder UI | Simplified: fixed-length setup step at signup (up to 3 subsequent roles, or documented defaults) | Less frontend work than a fully dynamic add/remove builder, still per-org and real. |
| Shared schemas | Move local Zod schemas into `@provenance/shared` | Single source of truth across API and frontend, consistent with the blockchain routes. |
| Testnet deployment | Last step, after everything works locally | Avoids developing against a rate-limited/latency-heavy testnet. |
| Testing scope | Keep existing tests green + add tests for the new consolidated flow; skip CI and empty test dirs | Proportional to the PoC's scope; CI can be added later. |
| `acordo_entrega` (deliverable documents) | Descoped from file upload; `deliverableHash` derived server-side from a JSON descriptor of the transfer data | Avoids multipart upload handling (multer) for marginal PoC value. |
| Threshold model (FR-10/FR-11) | Env-configurable global defaults (`TEMPERATURE_THRESHOLD_C=8`, `HUMIDITY_THRESHOLD_PCT=100`) with per-reading fixed-point ×100 representation | Simplest threshold source; per-lot overrides deferred. |

## Architecture deviations still open

1. **The product/lot vs. workflow/batch fork.** `transferencias.ts`/`produtos.ts` implement a full
   custody-transfer flow entirely in Postgres with no call into `blockchain.ts`. The consolidation
   plan resolves this by wiring them to `createBatch`/`transferCustody`/`reportCondition`, but
   this work (Phase 3) was interrupted before execution. The helper functions exist in
   `org-chain.ts` but are not yet consumed by any route.

2. **`loadCurrentUser`/`roleFromProfile` duplication.** Three copies still exist
   (`session.ts`, `organizacao.ts`, `produtos.ts`). Phase 0 consolidated `organizacao.ts` and
   `produtos.ts` to import from `session.ts`, but `transferencias.ts` has its own copies too.

3. **`docs/backend-api.md` endpoint table** is incomplete — it lists the blockchain routes and
   `/api/participantes/cadastro` but not `/api/produtos/*`, `/api/organizacao/*`, or
   `/api/transferencias/*`.

4. **`apps/frontend/README.md`** is stale — it still says "no implementation or frontend
   toolchain has been selected yet."

5. **`acordo_entrega` table** exists in the Prisma schema but is never used (file upload
   descoped).

## Immediate next steps (for whoever resumes)

1. Wire `produtos.ts` POST to `createBatch` (Phase 3.1) — the simplest first step; it
   validates the org→workflow→batch pipeline end-to-end.
2. Wire `transferencias.ts` confirm to `transferCustody` (Phase 3.2) — the most impactful;
   requires careful ordering (chain first, then Postgres mirror).
3. Add the conditions routes (Phase 3.3) — mostly plumbing, code already exists.
4. Move local Zod schemas to `@provenance/shared` (Phase 4.3).
5. Add the workflow-setup UI to `Cadastro.tsx` (Phase 4.1).
6. Write tests for the consolidated flow (Phase 5).
7. Deploy to Sepolia + Etherscan verify (Phase 6.1).
8. Final documentation pass (Phase 6.2).

## Files changed during consolidation

| File | Phase | Status |
|---|---|---|
| `apps/api/src/app.ts` | 0 | Committed — auth gate fixed, method-aware gating, `user.ts` mount removed |
| `apps/api/src/config/env.ts` | 0 | Committed — extended schema with auth/SMTP/condition vars |
| `apps/api/.env.example` | 0 | Committed — all new vars documented |
| `apps/api/package.json` | 0 | Committed — `test` script restored, `postinstall` for shared build |
| `apps/api/src/utils/jwt.ts` | 0 | Committed — reads `env.JWT_SECRET` |
| `apps/api/src/routes/auth.ts` | 0 | Committed — reads `env.RESET_CODE_SECRET` |
| `apps/api/src/service/email.service.ts` | 0 | Committed — reads `env` module, validates SMTP config |
| `apps/api/src/routes/organizacao.ts` | 0 | Committed — imports session helpers, reads `env.FRONTEND_URL` |
| `apps/api/src/routes/produtos.ts` | 0 | Committed — imports session helpers |
| `apps/api/src/routes/user.ts` | 0 | Deleted |
| `apps/package.json`, `apps/package-lock.json` | 0 | Deleted (stray files) |
| `apps/api/tests/app.test.ts` | 0 | Committed — Bearer tokens + unauthenticated rejection test |
| `apps/api/src/chain/hardhat-accounts.ts` | 1 | Committed — 10-account pool, first-free allocation |
| `apps/api/src/blockchain.ts` | 1 | Committed — signer override on all write functions |
| `apps/api/src/chain/org-chain.ts` | 1, 2, 3(partial) | Committed — service layer + Phase 3 helper scaffolding |
| `apps/api/prisma/schema.prisma` | 2 | Committed — `workflow_address`, `workflow_steps` on participante; `chain_batch_id`, `current_step_index` on lote |
| `apps/api/prisma/migrations/20261122160000_*` | 2 | Committed — migration SQL |
| `apps/api/src/routes/participantes.ts` | 2 | Committed — on-chain workflow deployment at signup |

## Known limitations (documented, accepted)

- The PoC is capped at 10 simultaneously registered organizations (the 10 Hardhat test accounts).
- `acordo_entrega` (deliverable document upload) was descoped — `deliverableHash` is derived server-side from a JSON descriptor.
- Field-level validation (FR-13) is minimal: steps carry name/role/document-hash only.
- Condition thresholds are global defaults (env-configured), not per-lot.
- The chain mirror is inline (per-request), not a background indexer.
- Sepolia deployment has not been performed.
