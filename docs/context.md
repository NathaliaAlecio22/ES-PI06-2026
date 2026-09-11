# Blockchain Product Provenance Tracker — Project Context

This document is a consolidated brief for a coding agent picking up implementation work. It reflects design decisions made during project scoping; treat it as the source of truth for architecture and intent, and flag any conflicts you find between this doc and partial code already in the repo.

## 1. Golden Circle

- **Why**: Trust in supply chains shouldn't depend on the goodwill or infrastructure of a single organization. A party that controls the historical record can alter, omit, or dispute it after the fact. This matters most for products where safety is on the line (medicine, food).
- **How**: Custody events are written to a shared, permissioned-by-role ledger every participant can independently verify. Rules governing valid transfers are enforced identically for everyone via smart contracts, not by trusting a middleman. Sensor data extends the same tamper-evident history to environmental conditions. An optional zero-knowledge layer lets organizations prove compliance without exposing confidential data.
- **What**: A **generic** blockchain-based traceability platform. An enterprise defines its own workflow (ordered steps, required role per step, required data per step) rather than the system hardcoding one fixed process (e.g. "Manufacturer → Distributor → Carrier..."). Each batch then follows that enterprise-defined workflow, with every transfer signed, timestamped, rule-checked, and queryable end-to-end.

## 2. Problem statement

During a product's lifecycle it passes through multiple custody holders (manufacturer, distributor, carrier, distribution center, retailer). Centralized tracking systems let whoever controls the database alter history. When something goes wrong (e.g. a temperature excursion), it can be hard to determine where and under whose custody the failure occurred. Relevant especially for food, pharma, electronics, high-value goods, and anything requiring specific transport/storage conditions.

## 3. Core architectural decisions (with rationale, so the agent doesn't re-litigate them)

### 3.1 Generic workflow, not a hardcoded process
Smart contract logic must not hardcode a fixed step sequence. Separate:
- **Workflow definition** — set once at contract construction: ordered steps, required role per step, and a hash reference to each step's full deliverable spec (see 3.3).
- **Rule enforcement** — generic contract logic that reads the definition and enforces sequence + authorization, rather than containing step-specific `if` branches.
- **Field-level data validation** (does a submission contain the right shape of data for a step) happens in the **backend**, before reaching the chain — on-chain computation should stay cheap and limited to sequence/authorization checks.

### 3.2 Ledger choice: public testnet (Ethereum-compatible), not a private permissioned network
Chose Solidity + an Ethereum-compatible chain over Hyperledger Fabric. Rationale: generic, schema-driven contract logic is easier to iterate on in Solidity; permissioning is handled via an in-contract access-control mapping rather than network-level organizational nodes, which is far simpler to operate for a 5-person team on a semester timeline. Consequence: the team does **not** run any blockchain nodes. Sepolia (or successor testnet) already has independent validators; the team only needs an RPC endpoint (Alchemy/Infura, or self-hosted if desired).

### 3.3 On-chain vs off-chain data split
- **On-chain, structured (contract must compute against it)**: admin address, ordered `Step[]` array (name, required role, `deliverableHash`), participant→role authorization mapping, current custody state per batch, custody transfer events.
- **On-chain, hash-only**: full deliverable specs per step, full certificates/documents, detailed sensor logs. Store the actual content off-chain (Postgres, optionally IPFS) and only the hash on-chain, so tamper-evidence is preserved without bloating the chain.
- **Off-chain only**: user accounts/login sessions, UI state, anything with no integrity/dispute relevance.
- The database should be treated as a **rebuildable mirror**, not the source of truth — it must be reconstructible from the chain's event history alone.

### 3.4 Participant identity is separate from workflow shape (important — avoids redeployment)
Participant addresses are **never** hardcoded into the constructor. The constructor defines the workflow's *shape* only (steps, required roles per step, deliverable hashes). Binding a specific address to a role happens via a separate `registerParticipant(address, Role)` call, restricted to the workflow's admin. Swapping a participant (e.g. distributor replaced) is `revokeParticipant` + `registerParticipant` on the existing contract — no redeployment needed. Redeployment is only required if the *shape* of the process changes (steps added/removed/reordered) — versioning strategy for that is explicitly out of MVP scope; note it as a known limitation.

### 3.5 Root of trust (explicitly out of on-chain scope)
The first admin of a workflow is whoever's address deployed/created it (`msg.sender` in the constructor or factory call) — this is an assertion, not a cryptographic proof of real-world legitimacy, and no on-chain mechanism can verify it. A production system would need an off-chain identity/KYC layer gating who may call `createWorkflow` in the first place. This is a known, accepted, explicitly-out-of-scope limitation for the MVP — document it, don't try to solve it.

### 3.6 Signature verification model
Two distinct checks per custody transfer, both required:
1. **Who signed this?** — `ecrecover(messageHash, signature)` recovers the signer's address. Pure math, needs no prior registry, works on any signature never seen before.
2. **Is that address allowed to do this?** — look up the recovered address against the on-chain `authorizedParticipants` mapping (must match required role for the current step) AND against the batch's current custodian (must match, to prevent an authorized-but-wrong-party transfer). Both are reads against state written by earlier transactions (`registerParticipant` and prior transfers respectively).

### 3.7 Sensor/oracle trust model
The chain guarantees a recorded reading can't be silently altered after the fact — it does **not** guarantee the reading was true when submitted (the "oracle problem"). MVP: single simulated sensor source per condition, threshold checked in a smart-contract rule, batch flagged automatically on breach. Stretch: multiple simulated sensors with a basic agreement rule (majority vote / outlier rejection) to raise (not solve) reliability.

## 4. Deployment / environment strategy

- **Local development (default, all iteration)**: Hardhat local network (`npx hardhat node`). Instant blocks, pre-funded test accounts, free, resettable, built-in debugging. Note explicitly in any report: a single local Hardhat node does **not** demonstrate real multi-party distributed consensus — it's a simulation of EVM execution rules for dev/test purposes only.
- **Demo / milestone deployments**: public testnet (Sepolia as of this writing; check current recommended testnet before final deployment, as Sepolia has a planned deprecation and a successor testnet is expected — verify via Ethereum Foundation announcements closer to the deadline). This is what should be linked/shown for any checkpoint presentation, since it demonstrates a real, externally-verifiable, independently-validated deployment.
- RPC access via a hosted provider (Alchemy or Infura) unless there's a specific reason to self-host a node.

## 5. RPC / ABI model (for whoever builds the backend integration)

- The **JSON-RPC protocol** (`eth_sendRawTransaction`, `eth_call`, `eth_getTransactionReceipt`, `eth_getLogs`, etc.) is fixed and contract-agnostic — it does not change based on what the contract does.
- The **ABI**, auto-generated at compile time from the Solidity source, describes each function's name/parameter/return types. `ethers.js` uses the ABI to encode calls into the raw bytes the RPC layer expects, and to decode responses.
- Writes (state-changing calls) require a signed transaction, gas, and wait for block inclusion; a receipt is returned with success/revert status, gas used, and any emitted event logs.
- Reads (`view`/`pure` functions) are synchronous `eth_call`s with no gas cost and no transaction — used for e.g. "get current custody chain for batch X."
- Contract should emit events (e.g. `CustodyTransferred(batchId, from, to, timestamp)`, `ParticipantRegistered(...)`, `ConditionBreached(...)`) — these are what the indexer service listens for; do not rely on polling contract storage directly for history.

## 6. Deployed services (target architecture)

No blockchain nodes are deployed by the team (public testnet is external infrastructure). The team's own infrastructure:

1. **API + indexer** (single process, Node.js/TypeScript, e.g. Express or NestJS + `ethers.js`) — listens for on-chain events, mirrors them into Postgres, serves REST endpoints for workflow CRUD, transfer submission (validates field schema before forwarding on-chain), and batch history queries. Keep indexer and API in one service for this scope; split only if a concrete scaling reason emerges.
2. **Database** (Postgres, own container) — indexed on-chain history for fast queries, off-chain storage for full documents/certs/sensor logs referenced by on-chain hashes, plus ordinary app data (accounts, sessions, roles for the dashboard UI). Treated as rebuildable from chain history, not authoritative.
3. **Sensor simulator** (small standalone Node/Python service) — posts mock condition readings on a timer, tied to batch IDs, as if it were an independent IoT device. Kept architecturally separate from the API deliberately, mirroring the real-world trust boundary between a backend and untrusted external devices.
4. **Frontend** (React + TypeScript, static build) — not a continuously-running "node"; deploy to static hosting (Vercel/Netlify or served via the same box). Calls the API from the browser.
5. **ZK prover (stretch goal only)** — isolated service, called via internal HTTP from the API when needed. Kept separate deliberately so slow proof generation never blocks main API responsiveness. Use Circom or Noir.

## 7. Smart contract sketch (illustrative, not final)

```solidity
enum Role { None, Manufacturer, Distributor, Carrier, DistributionCenter, Retailer, Admin }

struct Step {
    string name;
    Role requiredRole;
    bytes32 deliverableHash; // references full spec stored off-chain
}

contract Workflow {
    address public admin;
    Step[] public steps;
    mapping(address => Role) public authorizedParticipants;
    mapping(uint256 => BatchState) public batches; // batchId => current state

    constructor(Step[] memory _steps) {
        admin = msg.sender;
        for (uint i = 0; i < _steps.length; i++) {
            steps.push(_steps[i]);
        }
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    function registerParticipant(address worker, Role role) external onlyAdmin { ... }
    function revokeParticipant(address worker) external onlyAdmin { ... }

    function transferCustody(uint256 batchId, bytes calldata signature, ...) external {
        // 1. ecrecover signer from signature
        // 2. check authorizedParticipants[signer] matches steps[currentIndex].requiredRole
        // 3. check batches[batchId].currentHolder == signer (or step-appropriate check)
        // 4. check no skipped step, no double-claim, batch not already invalidated
        // 5. update state, emit CustodyTransferred event
    }

    function reportCondition(uint256 batchId, int256 value, ...) external {
        // check against threshold rule; if breached, mark batch compromised, emit event
    }
}
```

Factory pattern: a separate `WorkflowFactory` contract's `createWorkflow(Step[] memory steps)` deploys a new `Workflow` instance per enterprise, with `msg.sender` becoming that instance's admin automatically (no separate registration needed for the first participant).

## 8. Functional requirements (MVP)

- FR-01: Register authorized organizational identities per workflow instance.
- FR-02: Record a custody transfer (batch ID, current/previous responsible, timestamp, location, conditions, deliverable/document hash references).
- FR-03: Require digital signature from the transfer initiator.
- FR-04: Validate transfer is initiated only by the current authorized custodian for the current step's required role.
- FR-05: Enforce the enterprise-defined step sequence; reject skipped/invalid transitions.
- FR-06: Prevent concurrent/duplicate claims on the same batch.
- FR-07: Prevent movement of a batch already marked invalid/compromised.
- FR-08: Accept periodic sensor readings tied to a batch ID.
- FR-09: Evaluate readings against configurable thresholds; auto-flag on breach.
- FR-10: Query full custody history for a given batch.
- FR-11 (stretch): Generate/verify a ZK proof of compliance without revealing underlying data.
- FR-12 (stretch): Off-chain storage of high-volume sensor data with on-chain integrity hash anchoring.

## 9. Work division (5 people, for reference — adjust as needed)

1. **Smart contracts / workflow engine** — generic step/state-machine contract, signature verification, factory pattern.
2. **Backend / indexer / API** — event listener + Postgres mirror, REST API, field-schema validation before on-chain submission, auth.
3. **Frontend: enterprise/admin side** — workflow builder UI (define steps, roles, required fields per step).
4. **Frontend: operator + consumer/audit side, + sensor simulator** — dynamic transfer submission UI rendered from workflow schema, batch history/lookup UI, sensor simulator service.
5. **Infra/DevOps + integration testing + ZK stretch** — Hardhat/deployment scripts, CI, environment consistency, end-to-end testing across contract/backend/frontend, isolated ZK prover R&D.

Critical sequencing note: Persons 1 and 2 must agree on the workflow-definition data shape before Persons 3 and 4 build UI against it — this should be the first cross-team conversation.

## 10. Known, explicitly accepted limitations (state these in any writeup, don't try to solve them in MVP)

- No on-chain mechanism verifies real-world legitimacy of the first admin/deployer of a workflow (root-of-trust problem, same as CA trust in PKI).
- Sensor data integrity beyond "hasn't been altered since recorded" is not guaranteed (oracle problem) — MVP only raises this via multi-source agreement as a stretch, doesn't solve it.
- No versioning strategy yet for changing a workflow's step shape after batches are already in flight — redeployment required, migration story undefined.
- Single local Hardhat node used in dev does not itself demonstrate distributed consensus; only the testnet deployment does.
