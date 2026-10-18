# Smart Contracts

Hardhat 3 workspace for the generic Solidity workflow engine and factory described in
[`docs/context.md`](../docs/context.md) §3, §5, and §7. It owns workflow shape, participant
authorization, batch state, signature checks, threshold enforcement, and reconstructible event
emission — nothing here hardcodes a specific real-world process.

## Layout

```text
contracts/
  contracts/
    Workflow.sol           # per-enterprise workflow instance
    WorkflowFactory.sol    # deploys one Workflow per enterprise
    *.t.sol                # Foundry-style Solidity unit tests (forge-std)
  test/
    WorkflowFactory.ts     # TypeScript/mocha end-to-end tests (ethers)
  ignition/modules/
    WorkflowFactory.ts     # deployment module for the factory
  hardhat.config.ts
```

## Contracts

- **`WorkflowFactory`** — `createWorkflow(Step[] steps)` deploys a new `Workflow`, with the
  caller automatically becoming its admin.
- **`Workflow`** — one instance per enterprise.
  - `registerParticipant` / `revokeParticipant` (admin-only): bind/unbind an address to a role
    without redeploying (FR-01).
  - `createBatch` (admin-only): seeds a batch at step 0.
  - `transferCustody`: verifies an `ecrecover`'d signature from the current custodian against
    both the current step's required role and the recipient's role for the next step, then
    advances the batch (FR-02–FR-07). See `buildTransferDigest`/`recoverTransferSigner` in
    `apps/api/src/blockchain.ts` for the matching off-chain half.
  - `reportCondition`: records a sensor reading and auto-compromises the batch if
    `value > threshold` (FR-08/FR-09). Always emits `ConditionReported`, breach or not.

## Local development

```powershell
npm install

# Compile + run all tests (Solidity unit tests via forge-std, TypeScript via mocha+ethers)
npm test

# Terminal 1: persistent local node (http://127.0.0.1:8545, chainId 31337 — matches
# apps/api/.env.example's RPC_URL/CHAIN_ID defaults)
npm run node

# Terminal 2: deploy WorkflowFactory to that node
npm run deploy:local
```

`npm run deploy:local` prints the deployed `WorkflowFactory` address. Copy it into
`apps/api/.env` as `WORKFLOW_FACTORY_ADDRESS`, and set `TRANSACTION_SIGNER_PRIVATE_KEY` to one
of the private keys `npm run node` prints on startup (any account works; it only needs ETH on
this local chain, which every default account already has). apps/api can then exercise the
full write/read/event surface in `src/blockchain.ts` against a real chain.

Deploying again against the same running node is a no-op — Ignition tracks what it already
deployed under `ignition/deployments/chain-31337` (gitignored; see `.gitignore` for why). To
start over, stop the node (which resets all state) and re-run `npm run deploy:local`.

## Testing

```powershell
npm test              # everything
npm run test:solidity # Solidity unit tests only
npm run test:mocha    # TypeScript integration tests only
```

## Deploying to a testnet

Demo/milestone deployments target a public testnet. Copy `.env.example` to
`.env` and fill in `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` (a
funded Sepolia test account), then:

```powershell
npm run deploy:sepolia
npx hardhat verify --network sepolia <deployed WorkflowFactory address>
```

`ETHERSCAN_API_KEY` in `.env` is only needed for the `verify` step.

## Known limitations (see docs/context.md §10)

- No versioning: changing a workflow's step shape after batches are in flight requires a new
  deployment; there is no migration path.
- `reportCondition`'s breach rule (`value > threshold`) is a single-direction simplification;
  a two-sided range (e.g. a cold-chain band) would need a contract change.
