# PoC Limitations

Known constraints of the current proof of concept, for whoever picks this up next.

## Security / signing

- **Custodial signing, not real wallets.** The API holds the private key for every
  organization (one of the 10 standard, publicly documented Hardhat accounts) and signs
  on-chain transactions on their behalf. Fine against a local Hardhat node; unacceptable on
  any public network — real wallet integration (MetaMask or similar) is required before this
  goes anywhere near mainnet or a public testnet with real value.
- **Hard cap of 10 organizations** — one Hardhat account each, first-free allocation. The
  11th signup is rejected outright.
- Secrets (`JWT_SECRET`, `RESET_CODE_SECRET`, DB/RPC URLs) are only as safe as `.env`; no
  secrets manager.

## Data model

- `lote.chain_batch_id` is stored as a decimal string (`VARCHAR(80)`), not a numeric column
  — Postgres's 64-bit `BIGINT` can't hold a `uint256`. No SQL-level arithmetic/ordering on it.
- The chain mirror is **inline and per-request**: each write route awaits the tx receipt and
  writes the result into the same Postgres row in the same request. There is no background
  event indexer. If the API is down when an on-chain write happens through another path, or
  crashes between a successful chain call and the Postgres write, the two fall out of sync
  with no reconciliation.
- Two separate, non-interoperating systems exist side by side: the real Postgres-backed
  custody flow (`produtos`/`transferencias`/`condicoes`) and a generic in-memory demo engine
  (`/api/workflows`, `/api/batches`, backed by `store.ts`, lost on restart). Don't confuse
  one for the other.
- The live Supabase database still has unused leftover tables/column
  (`cadeias_custodia`, `etapas_cadeia_custodia`, `movimentacao.etapa_cadeia_id`) from an
  earlier, abandoned schema design. Not referenced anywhere in the code; not yet dropped.
- `acordo_entrega` (deliverable document upload) is descoped: the "deliverable hash"
  committed on-chain is derived server-side from a JSON descriptor of the transfer, not an
  uploaded file. The table exists in the schema but nothing writes to it.

## Scope cuts

- Field-level validation (FR-13) is minimal — a custody step carries only a name, a role,
  and a document hash, not a structured form.
- Condition thresholds (temperature/humidity) are a single pair of env-configured global
  defaults, not per-lot or per-product.
- The workflow-setup UI only supports a fixed chain of up to 3 subsequent roles after the
  organization's own, not an arbitrary add/remove builder.

## Testing / deployment

- No automated tests cover the consolidated chain-wired flow yet. It has been exercised
  once, manually, end-to-end against a live local Hardhat node and the real Supabase
  database (signup → product → transfer → confirm → condition breach), then the test rows
  were deleted — there is no regression protection if this breaks again.
- Never deployed to a public testnet (Sepolia or otherwise) or verified on a block explorer.
- The frontend has only been typechecked and linted, never manually exercised in a browser.
