# PoC Checklist

Derived from [`docs/requirements.md`](requirements.md), [`docs/context.md`](context.md), and
[`docs/architecture.md`](architecture.md). Status was verified directly against the code on
`app/api`, not assumed from docs alone (built it, generated the Prisma client, ran the test
suites). Re-check this list whenever a requirement or its backing code changes.

Legend: `[x]` done and verified · `[~]` partially done (see note) · `[ ]` not started.

> **Update (2026-11-22):** `app/api` was re-synced from origin (the branch had been rebased
> upstream — same logical history up to the previous "Organization and admin page" merge, just
> new commit hashes — plus ~10 genuinely new commits on top: a working custody-transfer flow,
> an email-invite user-management system, and chart/UI polish). This revision re-verifies
> everything against that state. Per instruction, **nothing in the codebase was changed** while
> producing this update — findings below are notes only, split into "needs consolidation"
> (duplicated/drifting but not broken) and "blatant deviations" (verified bugs/regressions or
> architecture-contradicting decisions).

## 1. Smart contracts (`contracts/`) — unchanged

- [x] FR-01 through FR-09, FR-10/FR-11 (contract half) — unchanged from the previous check, still solid. See prior revisions of this file for detail; no contract code changed in this update's diff.
- [x] Foundry + mocha test coverage — unchanged.
- [ ] Testnet deployment and Etherscan verification — still not done.

## 2. Backend API — blockchain-backed routes (`apps/api/src/app.ts`)

- [x] Core workflow/batch/transfer/history routes — unchanged, still work (contract-side).
- [x] `DELETE /api/workflows/:workflowId/participants/:address` — still present (FR-02 API gap stays closed).
- [ ] FR-10/FR-11 (API half) — still not done. `reportCondition`/`getConditionBreaches` remain imported into `app.ts` and never called by any route. Confirmed again this pass — still dead imports.
- [ ] FR-12, FR-13 — unchanged, still not done (in-memory-only history, no per-step field validation).
- [~] FR-14 (Application Authentication) — now has a real, mostly-complete implementation: login, registration, forgot/reset password, **and now email-based user invites with role assignment** (see §3). Still not integrated with the blockchain routes' authorization model by design — but see the blatant deviation below about *how* it was half-wired in.

## 3. Backend API — Postgres/Prisma routes (`apps/api/src/routes/`)

Substantially larger than last time. In addition to the previously-reviewed `participantes.ts`
(org+admin registration) and `produtos.ts` (product/lot CRUD):

- [x] **New: `transferencias.ts`** — a real custody-transfer workflow entirely inside Postgres:
  create a pending transfer (atomically claims the lot via a conditional `updateMany`, blocks a
  second concurrent transfer on the same lot), the destination organization confirms (custody
  moves) or raises an issue (custody stays), role-gated (`VIEWER` can't create/confirm/raise),
  records temperature/humidity against the lot on creation. This is a meaningfully better
  "claim consistency" pattern (FR-08-style) than the earlier bare product CRUD — it's good,
  careful code. It still never touches the chain (see deviation below).
- [x] **New: `organizacao.ts`** — admin-gated user management: list org users + pending
  invites, send a token-hashed (SHA-256, never stored raw) 7-day email invite, accept an invite
  to create the account. Rolls back the invite row if the invite email fails to send. Good
  quality, consistent with the reset-password work reviewed last time.
- [x] **New: `apps/api/tests/password.test.ts`** — a real unit test was added, including a
  regression test for a legacy password-hash format. Welcome, and the first unit test (as
  opposed to integration test) in `apps/api`.
- [x] `apps/api/src/service/email.service.ts` was hardened: validates SMTP config upfront with
  clear error messages, checks the provider actually accepted the recipient, escapes HTML in
  the invite email (XSS-safe), chooses STARTTLS/TLS by port. Clear improvement over the previous
  version.
- [x] `apps/api/src/utils/password.ts`'s confusing `!salt !` expression from last check is gone,
  replaced with a readable, correct check, plus support for a legacy `$`-delimited hash format.

## 4. Data & infrastructure

- [x] `.env.example` now documents `SMTP_HOST/PORT/USER/PASS/FROM` and `FRONTEND_URL` (closes
  part of the previously-flagged undocumented-env-var gap).
- [ ] Still undocumented in `.env.example` / not validated through `config/env.ts`: `JWT_SECRET`,
  `RESET_CODE_SECRET`, `DIRECT_URL` (required by `prisma7.config.ts` for `prisma generate`/
  migrations), `CORS_ORIGIN`. Verified again this pass: a fresh clone following the documented
  `.env.example` still cannot run `prisma generate`, start the dev server, or load the test
  suite without discovering these by reading source first.
- [ ] Rebuildable Postgres mirror of **chain** events — still not done; still no indexer process.
  The Postgres schema has grown (now also `ConviteUsuario`/invites), but it's still the
  product/lot/movement domain, not a mirror of `CustodyTransferred`/`ConditionReported`.

## 5. Frontend (`apps/frontend/TraceBlock/`)

- [x] Organization management page and the new "accept invite" screen (`/aceitar-convite`) are
  now wired to the real `/api/organizacao/*` endpoints — genuine integration progress, not mocks.
- [x] Transfers page wired to `/api/transferencias/*` — also real, not mocks.
- [ ] FR-15/FR-16 (workflow/batch-driven UI) — still not started; nothing calls `/api/workflows`
  or `/api/batches`.
- [ ] NFR-08 — still not assessed.

## 6. Testing

- [x] Contract + prior API integration tests — unchanged.
- [x] New: `password.test.ts` unit test, passes standalone.
- [ ] **`npm test` in `apps/api` is still broken** — the `"test"` script removed two revisions
  ago has not been restored. `npm test` still fails with `Missing script: "test"`.
- [ ] **New regression, found this pass:** running the suite directly (`npx vitest run`, with
  `JWT_SECRET`/`RESET_CODE_SECRET`/`DIRECT_URL` set locally so it can even load) now shows **3
  previously-passing tests failing** — see blatant deviation #1 below for why.
- [ ] `tests/integration/`, `tests/e2e/`, CI — unchanged, still not done.

## 7. Definition of Done for MVP — rollup

Unchanged from the previous check except FR-02 (closed earlier) and a larger slice of FR-14
(closed this round). Still not met overall: FR-10/11/12/13/15/16 open, no testnet deployment,
no chain-event mirror.

---

## What should be consolidated (duplicated or drifting, not broken)

1. **`loadCurrentUser`/`loadAuthenticatedUser` is now implemented three times**, and the copies
   have already drifted:
   - `apps/api/src/utils/session.ts` exports `loadCurrentUser` — checks `user.ativo` (the
     individual account's active flag) **and** `user.participante?.ativo` (the org's).
   - `apps/api/src/routes/organizacao.ts` defines its own local `loadCurrentUser` — checks
     **only** `user.participante?.ativo`, not `user.ativo`. A user whose individual account has
     been deactivated (e.g. via `organizacao.ts`'s own user-management screen, which sets
     `status: "ACTIVE"/"INACTIVE"` off `user.ativo`) can still authenticate against
     `organizacao.ts`'s own routes, but would be rejected by `transferencias.ts` (which uses
     `session.ts`'s stricter version). That's a real, security-relevant inconsistency between
     two copies of "the same" check, not just stylistic duplication.
   - `apps/api/src/routes/produtos.ts` has a third, differently-named copy
     (`loadAuthenticatedUser`), matching `session.ts`'s stricter behavior but still not reusing
     it.
   - `roleFromProfile` is also duplicated (`session.ts` and `organizacao.ts` each define their
     own, currently identical, copy).
   - Recommendation: have `produtos.ts`/`organizacao.ts` import `loadCurrentUser`/
     `roleFromProfile` from `session.ts` and delete their local copies; decide deliberately
     whether the individual-account-active check belongs in the shared version (it should).
2. **Two patterns for request validation now coexist long-term**: `@provenance/shared` Zod
   schemas (used by the blockchain routes) vs. locally-defined Zod schemas per route file (used
   by every Postgres route: `participantes.ts`, `produtos.ts`, `transferencias.ts`,
   `organizacao.ts`, `auth.ts`). Not wrong by itself, but the frontend independently re-declares
   matching types in `services/*.ts` for each of these, with nothing keeping the two sides in
   sync. Worth a deliberate decision either to move these into `@provenance/shared` too, or to
   explicitly document that Postgres-only routes are exempt from that convention.
3. **`docs/backend-api.md`'s endpoint table is now incomplete**: it lists the blockchain routes
   and `/api/participantes/cadastro`, but not `/api/produtos/*`, `/api/organizacao/*`, or
   `/api/transferencias/*`, despite those being the bulk of the recently added, functioning
   surface. Low-risk, but will mislead anyone using that doc as a reference.
4. **`GET /api/auth/me` is still defined twice** (`auth.ts` and `user.ts`, both mounted at
   `/api/auth`) — flagged last check, unchanged. `user.ts`'s version (which reuses the
   `autenticar` middleware) is still shadowed/unreachable.
5. **Stray `apps/package.json`/`apps/package-lock.json`** — flagged last check, still present,
   still looks like an accidental `npm install` from the wrong directory.

## What's blatantly deviated (verified bugs or architecture-contradicting decisions)

1. **A typo silently defeats the one attempt made to add authorization to the blockchain
   routes, and also breaks an existing test suite.** `apps/api/src/app.ts:84`:
   ```ts
   app.use(["/api/worflows", "/api/batches"], autenticar);
   ```
   `"/api/worflows"` is misspelled (missing the `k`), so it **never matches** the real
   `/api/workflows*` routes — every workflow-admin action (create workflow, register/revoke
   participant) remains completely unauthenticated, silently, with no indication anywhere that
   protection was intended but failed to apply. Meanwhole `/api/batches` **is** spelled
   correctly and now requires a Bearer token for every one of its routes — including
   `GET /api/batches/:batchId/history`, a read-only lookup that `docs/context.md`'s own actor
   model describes as used by an "Auditor/consumer" who isn't necessarily a registered
   organization user. Verified by actually running the suite: **3 previously-passing tests in
   `apps/api/tests/app.test.ts` now fail**, all with the same symptom — the middleware returns
   401 before the route handler (and its 404/409 business-logic responses) ever runs. This is
   the single most concrete, confirmed regression in this revision.
2. **The custody-transfer domain fork described in the previous checklist is now deeper, not
   shallower.** `transferencias.ts` adds a second, more complete pending→confirm/issue custody
   workflow, entirely in Postgres, with no call into `blockchain.ts` at any point (no
   `transferCustody`, no signature requirement, no role check against the on-chain
   `authorizedParticipants` mapping — only against the Postgres `usuario.perfil`/`roleFromProfile`).
   `movimentacao.tx_hash` is written nowhere in this flow (still only ever read, surfaced to the
   frontend as `"Pendente"` forever), and `status_blockchain` still defaults to `"PENDENTE"` and
   is never updated either. This is the same architectural inversion flagged last time
   (chain-first/mirror-second, per `docs/context.md` §3.3 and NFR-01) — except now it's a fuller,
   more convincing feature, which raises the cost of reconciling it later the longer it's built
   on without a decision. This is still the single highest-leverage open question for the
   project: is the Postgres `lote`/`movimentacao` domain meant to *become* the on-chain-backed
   batch/transfer flow (in which case it needs real `transferCustody` calls, signatures, and
   `tx_hash` writes wired in), or is it intentionally a separate internal system (in which case
   FR-04/FR-08/FR-10/FR-12, which all assume on-chain custody transfers, need to be re-scoped in
   the requirements doc to match)?
3. **Test suite regression from the previous checklist is still unresolved**, and is now worse:
   `apps/api/package.json`'s `"test"` script is still missing (`npm test` still fails outright
   with `Missing script: "test"`), and even bypassing that, the suite now has 3 genuine
   failures on top of the previous "fails to load without `JWT_SECRET`" issue (both issues
   verified again this pass, by actually installing, generating the Prisma client, and running
   `npx vitest run`).
