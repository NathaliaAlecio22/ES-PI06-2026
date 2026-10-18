// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

/**
 * @title Workflow
 * @notice Generic, enterprise-defined custody workflow.
 * One instance is deployed per enterprise by `WorkflowFactory`. The constructor only fixes the
 * workflow's *shape* (ordered steps, required role per step, a hash of each step's full
 * deliverable spec) — participant addresses are bound later via `registerParticipant` so
 * swapping a participant never requires redeploying.
 */
contract Workflow {

  enum Role {
    None,
    Manufacturer,
    Distributor,
    Carrier,
    DistributionCenter,
    Retailer,
    Admin
  }

  enum BatchStatus {
    Active,
    Compromised
  }

  struct Step {
    string name;
    Role requiredRole;
    /// @dev References the step's full deliverable spec, stored off-chain (docs/context.md §3.3).
    bytes32 deliverableHash;
  }

  struct BatchState {
    address currentCustodian;
    uint256 currentStepIndex;
    BatchStatus status;
    uint256 updatedAt;
  }

  /// @notice Set once at construction to whoever called the factory.
  address public admin;

  Step[] private steps;

  /// @notice participant => role. `Role.None` means the address is not currently authorized.
  mapping(address => Role) public authorizedParticipants;

  /// @notice batchId => current custody state. History lives in `CustodyTransferred` events,
  /// not here.
  mapping(uint256 => BatchState) public batches;

  event ParticipantRegistered(address indexed participant, Role indexed role);
  event ParticipantRevoked(address indexed participant);
  event BatchCreated(uint256 indexed batchId, address indexed initialCustodian);
  event CustodyTransferred(
    uint256 indexed batchId,
    address indexed from,
    address indexed to,
    uint256 stepIndex,
    bytes32 deliverableHash,
    bytes32 dataHash,
    uint256 timestamp
  );
  /// @dev Emitted for *every* reading, breach or not — see `reportCondition`.
  event ConditionReported(uint256 indexed batchId, bytes32 conditionKey, int256 value, int256 threshold, uint256 timestamp);
  event BatchCompromised(uint256 indexed batchId, string reason);

  modifier onlyAdmin() {
    require(msg.sender == admin, "Workflow: caller is not admin");
    _;
  }

  /**
   * @param _admin The address that becomes this workflow's admin.
   */
  constructor(address _admin, Step[] memory _steps) {
    require(_admin != address(0), "Workflow: admin is zero address");
    require(_steps.length > 0, "Workflow: at least one step is required");
    admin = _admin;
    for (uint256 i = 0; i < _steps.length; i++) {
      require(_steps[i].requiredRole != Role.None, "Workflow: step requiredRole cannot be None");
      require(_steps[i].deliverableHash != bytes32(0), "Workflow: step deliverableHash cannot be zero");
      steps.push(_steps[i]);
    }
  }

  // -------------------------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------------------------

  function getSteps() external view returns (Step[] memory) {
    return steps;
  }

  function stepCount() external view returns (uint256) {
    return steps.length;
  }

  // -------------------------------------------------------------------------------------------
  // FR-01: participant authorization (admin-only)
  // -------------------------------------------------------------------------------------------

  function registerParticipant(address participant, Role role) external onlyAdmin {
    require(participant != address(0), "Workflow: participant is zero address");
    require(role != Role.None, "Workflow: cannot register Role.None");
    authorizedParticipants[participant] = role;
    emit ParticipantRegistered(participant, role);
  }

  /// @dev Companion to `registerParticipant`: swap/replace a participant without redeploying
  /// the workflow (docs/context.md §3.4).
  function revokeParticipant(address participant) external onlyAdmin {
    authorizedParticipants[participant] = Role.None;
    emit ParticipantRevoked(participant);
  }

  // -------------------------------------------------------------------------------------------
  // Batch lifecycle
  // -------------------------------------------------------------------------------------------

  /**
   * @notice Seeds on-chain state for a new batch at step 0.
   */
  function createBatch(uint256 batchId, address initialCustodian) external onlyAdmin {
    require(initialCustodian != address(0), "Workflow: initialCustodian is zero address");
    require(batches[batchId].currentCustodian == address(0), "Workflow: batch already exists");
    require(
      authorizedParticipants[initialCustodian] == steps[0].requiredRole,
      "Workflow: initialCustodian lacks required role for step 0"
    );

    batches[batchId] = BatchState({
      currentCustodian: initialCustodian,
      currentStepIndex: 0,
      status: BatchStatus.Active,
      updatedAt: block.timestamp
    });

    emit BatchCreated(batchId, initialCustodian);
  }

  /**
   * @notice FR-02..FR-07: records a custody transfer out of the batch's current step.
   *
   * Two independent checks per docs/context.md §3.6, both required:
   * 1. `ecrecover` (via `signature`) recovers who signed the transfer digest — pure math,
   *    reproducible off-chain (see `buildTransferDigest`/`recoverTransferSigner` in
   *    apps/api/src/blockchain.ts) so the API can reject a bad signature before spending gas.
   * 2. The recovered signer must be both the batch's current custodian AND hold the role
   *    required by the current step — two separate state reads this contract is the sole
   *    authority for.
   *
   * The recipient (`to`) must already be authorized for the *next* step's required role,
   * which is what actually enforces the enterprise-defined sequence (FR-05): you cannot hand
   * custody to someone who isn't allowed to perform the next step.
   */
  function transferCustody(
    uint256 batchId,
    address to,
    bytes32 deliverableHash,
    bytes32 dataHash,
    bytes calldata signature
  ) external {
    require(to != address(0), "Workflow: to is zero address");
    BatchState storage batch = batches[batchId];
    require(batch.currentCustodian != address(0), "Workflow: batch does not exist");
    require(batch.status == BatchStatus.Active, "Workflow: batch is compromised"); // FR-07

    uint256 currentStep = batch.currentStepIndex;
    require(currentStep + 1 < steps.length, "Workflow: batch already at final step"); // FR-05
    uint256 nextStep = currentStep + 1;

    bytes32 digest = keccak256(
      abi.encodePacked(address(this), block.chainid, batchId, to, deliverableHash, dataHash)
    );
    address signer = _recoverSigner(digest, signature); // FR-03

    // FR-04 + FR-06, enforced as two independent checks (docs/context.md §3.6):
    // 1. custodian — authority over THIS batch belongs only to its current holder;
    // 2. role — authorization is revocable: if the admin revokes or re-registers this
    //    custodian under a different role (docs/context.md §3.4) while a batch is in
    //    flight, the stale custodian can no longer move it, even though they still *are*
    //    the custodian.
    //
    // Note the operational consequence: revoking a custodian freezes their in-flight
    // batches (only recoverable by re-registering that address — there is no admin
    // force-transfer). Reverts here are always safe: they discard the state change.
    require(signer == batch.currentCustodian, "Workflow: signer is not the current custodian");
    require(
      authorizedParticipants[signer] == steps[currentStep].requiredRole,
      "Workflow: signer lacks required role for current step"
    );
    require(
      authorizedParticipants[to] == steps[nextStep].requiredRole,
      "Workflow: recipient lacks required role for next step"
    );

    batch.currentCustodian = to;
    batch.currentStepIndex = nextStep;
    batch.updatedAt = block.timestamp;

    emit CustodyTransferred(batchId, signer, to, nextStep, deliverableHash, dataHash, block.timestamp);
  }

  /**
   * @notice FR-08/FR-09: records a sensor reading and auto-flags the batch if it breaches
   * `threshold`.
   *
   * Emits `ConditionReported` for every reading regardless of outcome (see the event's
   * NatSpec) — callers compare `value` against `threshold` themselves if they only care about
   * actual breaches, exactly as apps/api/src/blockchain.ts's `getConditionBreaches` already
   * assumes.
   */
  function reportCondition(uint256 batchId, bytes32 conditionKey, int256 value, int256 threshold, uint256 timestamp) external {
    BatchState storage batch = batches[batchId];
    require(batch.currentCustodian != address(0), "Workflow: batch does not exist");
    require(batch.status == BatchStatus.Active, "Workflow: batch is compromised");

    emit ConditionReported(batchId, conditionKey, value, threshold, timestamp);

    if (value > threshold) {
      batch.status = BatchStatus.Compromised;
      batch.updatedAt = block.timestamp;
      emit BatchCompromised(batchId, "condition threshold breached");
    }
  }

  // -------------------------------------------------------------------------------------------
  // Signature recovery (docs/context.md §3.6, check 1)
  // -------------------------------------------------------------------------------------------

  /// @dev EIP-191 personal-sign digest, matching `ethers.verifyMessage` on the API side
  /// (see `recoverTransferSigner` in apps/api/src/blockchain.ts).
  function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address) {
    require(signature.length == 65, "Workflow: invalid signature length");
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      r := calldataload(signature.offset)
      s := calldataload(add(signature.offset, 32))
      v := byte(0, calldataload(add(signature.offset, 64)))
    }
    if (v < 27) {
      v += 27;
    }
    require(v == 27 || v == 28, "Workflow: invalid signature v value");

    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    address signer = ecrecover(ethSignedMessageHash, v, r, s);
    require(signer != address(0), "Workflow: invalid signature");
    return signer;
  }
}
