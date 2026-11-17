# PoC Checklist

Derived from [`docs/requirements.md`](requirements.md), [`docs/context.md`](context.md), and
[`docs/architecture.md`](architecture.md). Status was verified directly against the code on
`app/api` (post-rebase onto `master`), not assumed from docs alone. Re-check this list whenever
a requirement or its backing code changes — it will go stale otherwise, same as any other doc.

Legend: `[x]` done and verified in code · `[~]` partially done (see note) · `[ ]` not started.

## 1. Smart contracts (`contracts/`)

- [x] FR-01 — Participant registration/authorization, admin-only, address not baked into constructor, emits `ParticipantRegistered` (`Workflow.sol`).
- [x] FR-02 (contract half) — `revokeParticipant` implemented and emits `ParticipantRevoked`.
- [x] FR-03 — Generic workflow definition from ordered `Step[]` (name, role, deliverable hash); no hardcoded sequence; creator becomes admin via `WorkflowFactory`.
- [x] FR-04 — `CustodyTransferred` records batch id, from/to, step index, deliverable/data hashes, timestamp.
- [x] FR-05 — Signature required and recovered via `ecrecover` (`_recoverSigner`).
- [x] FR-06 — Transfer requires signer to be both current custodian and holder of the current step's role.
- [x] FR-07 — Step sequence enforced (`currentStep + 1 < steps.length`, cannot skip/repeat).
- [x] FR-08 — Stale/duplicate claims rejected: batch state mutates on success, so a replayed signature no longer matches the (now different) current custodian.
- [x] FR-09 — Compromised batches block further `transferCustody` and `reportCondition` calls.
- [x] FR-10/FR-11 (contract half) — `reportCondition` records every reading and auto-compromises + emits `BatchCompromised` on breach (`value > threshold`).
- [x] Foundry unit tests (`Workflow.t.sol`, `WorkflowFactory.t.sol`) + Hardhat/mocha e2e test (`test/WorkflowFactory.ts`) covering deploy → register → batch → transfer → breach, plus a rejected-signer case.
- [ ] Deployment to a public testnet (Sepolia). Config and scripts exist (`hardhat.config.ts`, `npm run deploy:sepolia`), but no deployed address is recorded anywhere in the repo — only local `chain-31337` artifacts exist. **Required by the Definition of Done** (§8: "demonstrated locally and on a public testnet").
- [ ] Contract verification on Etherscan after a testnet deploy (`npx hardhat verify`, scripted but never run).

## 2. Backend API (`apps/api/`)

- [x] `POST /api/workflows` → deploys on-chain via factory, mirrors the result (FR-03).
- [x] `POST /api/workflows/:workflowId/participants` → calls `registerParticipant` (FR-01).
- [x] `POST /api/batches` → validates initial-custodian role, calls `createBatch`.
- [x] `POST /api/batches/:batchId/transfers` → off-chain signature pre-check + role checks + calls `transferCustody` (FR-04–FR-07).
- [x] `GET /api/batches/:batchId/history` → returns transfers recorded *during this process's lifetime*.
- [x] `GET /api/chain/status`, `GET /api/health`.
- [x] Request validation via shared Zod schemas (`@provenance/shared`), 400/404/409/401/502 error mapping, revert-reason decoding.
- [x] API test suite (`apps/api/tests/app.test.ts`): 10 passing (validation-only), 6 more exercising real on-chain calls against a local Hardhat node (need `contracts/` node + deploy running to execute).
- [ ] FR-02 (API half) — **no REST route calls `revokeParticipant`**, even though `blockchain.ts` already implements it. Participants can be registered but never revoked through the API.
- [ ] FR-10/FR-11 (API half) — **no REST route submits a condition reading or queries breaches**, even though `blockchain.ts` already implements `reportCondition`/`getConditionBreaches` and the `ConditionReported` event listener. (Consistent with the sensor-simulator addendum already in the docs — the gap is specifically the missing route + caller, not the chain integration.)
- [ ] FR-12 — Batch history is **not** "the complete indexed custody and condition history": it's served from the same in-memory `Map` the write routes populate, not from indexed chain events, and it never includes condition reports/breaches. There is no running indexer (see §3).
- [ ] FR-13 — Off-chain field-level validation against a step's full deliverable specification. Only fixed DTO fields (`deliverableHash`, `locationReference`, `conditionReferences`) are validated; there's no per-step arbitrary required-fields schema or validation against it.
- [ ] FR-14 — Application authentication (accounts, sessions, dashboard permissions). The only implementation that existed was master's independent Prisma/JWT backend, which was intentionally dropped during the `app/api` rebase as architecturally incompatible (different stack from `app/api`'s Zod/in-memory/ethers backend). **Nothing currently implements FR-14 on the kept lineage.**
- [ ] Persistence (NFR-01/NFR-04/NFR-05, "Próximas evoluções" #1 in `docs/backend-api.md`). Store is explicitly in-memory and lost on restart (`store.ts`: `// NOTE: This is an in-memory store`). No Postgres/Supabase client exists in `apps/api` at all (`DATABASE_URL` is required by `config/env.ts` but never used).
- [ ] Event indexer. `blockchain.ts` defines event-subscription handlers ("backbone for the indexer") but **nothing calls them anywhere** — no process listens for `CustodyTransferred`/`ParticipantRegistered`/`ConditionReported` and mirrors them into storage.
- [x] Dead code cleanup opportunity (not a requirement, just noise found during review): `apps/api/src/index.ts` is an unused, separate minimal Express scaffold left over from initial boilerplate — `server.ts`/`app.ts` is the real entrypoint (`npm run dev`/`start` use it). Harmless but should probably be deleted.

## 3. Data & infrastructure

- [ ] Supabase actually provisioned and connected. Docs now describe Supabase as the Postgres host (replacing the dropped `infra/` Docker plan), but no project is wired up: no `@supabase/supabase-js` or `pg`/Prisma dependency, no connection code, no schema/migrations.
- [ ] Rebuildable Postgres mirror (NFR-05/NFR-04): depends on both the indexer and the Supabase connection above — neither exists yet.
- [x] `infra/` folder and branch dropped per decision; docs updated accordingly.
- [x] `zk/` stretch goal explicitly dropped for lack of time; docs updated accordingly.
- [x] `apps/sensor-simulator/` explicitly dropped for lack of time; docs updated accordingly (contract/backend support exists per FR-10/FR-11 notes above, just not the standalone process or its REST route).

## 4. Frontend (`apps/frontend/TraceBlock/`)

- [x] React/TypeScript/Tailwind app exists with pages for overview, custody, participantes, products, reports, sensors, transfers, blockchain, plus auth (login/cadastro/forgot-password) — UI shell is built (contributes visually toward FR-15/FR-16).
- [ ] FR-15 (Workflow Administration UI) — no UI renders/edits the real shared workflow schema (ordered steps, per-step role, per-step required fields) or calls `POST /api/workflows`. Participants page uses a static mock array (`participantes.data.ts`), not the API.
- [ ] FR-16 (Operator/Audit UI) — transfer/custody/history pages use static mock data (`transfers.data.ts`, `custody.data.ts`, etc.); none call `POST /api/batches`, `/transfers`, or `/history`. Forms are not generated from a workflow specification.
- [ ] Auth integration is broken relative to the kept backend: `src/services/auth.ts` and `src/services/participantes.ts` call `/login`, `/me`, `/participantes/cadastro` — endpoints that only ever existed in master's dropped Prisma backend. These calls will fail against `app/api` as it stands (see FR-14 above).
- [ ] `apps/frontend/README.md` is stale: it still says "no implementation or frontend toolchain has been selected yet," even though `TraceBlock/` is a fully scaffolded Vite/React app. Needs the same kind of update done for other stale docs.
- [ ] NFR-08 (Accessibility/responsiveness) not assessed — no audit has been done against keyboard nav, labeling, or contrast.

## 5. Testing

- [x] Contract unit tests (Foundry-style `.t.sol`) and contract↔factory integration test (mocha/ethers).
- [x] API integration tests (`apps/api/tests/app.test.ts`), including a subset that exercises real on-chain calls.
- [ ] `tests/integration/` and `tests/e2e/` — both still just placeholder `README.md`s (NFR-07: "Core workflow, transfer, breach, and history paths shall have end-to-end tests"). The real tests that exist today live inside `contracts/` and `apps/api/`, not here; nothing spans contracts→API→frontend together, and nothing drives the frontend at all (no Playwright/Cypress-style suite).
- [ ] No CI pipeline (no `.github/workflows` or equivalent) running any of the above automatically.

## 6. Documentation & scope decisions

- [x] `docs/requirements.md`, `docs/context.md`, `docs/architecture.md`, `docs/backend-api.md`, `README.md` updated with addenda for: sensor simulator dropped, ZK dropped, `infra/` dropped in favor of Supabase.
- [x] Known, accepted limitations already stated per Definition of Done item 7 (oracle problem, root-of-trust, no workflow versioning, local Hardhat ≠ consensus).
- [ ] `apps/frontend/README.md` stale (see above) — missed in the earlier doc pass since it predates the frontend existing in this branch.
- [ ] This checklist itself should be kept current — revisit after any further implementation work.

## 7. Definition of Done for MVP (`docs/requirements.md` §8) — rollup

- [ ] FR-01 through FR-16 implemented and verified — **not met**: FR-02/FR-10/FR-11/FR-12 partial, FR-13/FR-14/FR-15/FR-16 not started.
- [ ] Complete batch lifecycle demonstrated locally **and on a public testnet** — local is achievable manually (contract + API tests prove the flow); testnet deployment has not happened.
- [x] Invalid role/signer/sequence/duplicate/compromised-batch transfers rejected — covered by contract + API tests.
- [x] Threshold breach auto-compromises a batch and blocks movement — covered by contract tests.
- [ ] Postgres can be cleared and rebuilt from blockchain events — blocked on indexer + Supabase wiring (§3 above).
- [x] No credentials or private keys tracked by Git — `.env.example` files only use well-known local Hardhat test keys.
- [x] Accepted limitations stated in project documentation.

## Suggested next priorities, in rough dependency order

1. Wire a minimal indexer + Supabase connection (unblocks FR-12, NFR-01/04/05, and the "rebuildable mirror" DoD item).
2. Add the two missing REST routes (`revoke participant`, `report condition` / breach query) — the hard part (contract + `blockchain.ts`) is already done.
3. Decide and implement FR-14 (application auth) from scratch against `app/api`'s own stack, since the previous implementation was dropped.
4. Wire the frontend's workflow/batch/transfer pages to the real API and drop the mock `*.data.ts` fixtures; fix or rebuild the auth screens against whatever FR-14 implementation lands.
5. Add field-level validation against per-step deliverable specs (FR-13), which also unblocks a real FR-15 admin UI.
6. Sepolia deployment + verification, then point the API/frontend at it for the milestone demo.
7. Fill in `tests/integration/` and `tests/e2e/`, and add a CI workflow.
