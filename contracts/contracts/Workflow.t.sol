// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {Workflow} from "./Workflow.sol";

contract WorkflowTest is Test {
  Workflow workflow;

  address admin = address(0xA11CE);
  address manufacturer = address(0xB0B);
  address distributor = address(0xC0FFEE);

  function _steps() internal pure returns (Workflow.Step[] memory steps) {
    steps = new Workflow.Step[](2);
    steps[0] = Workflow.Step({name: "Origin", requiredRole: Workflow.Role.Manufacturer, deliverableHash: keccak256("step-0")});
    steps[1] = Workflow.Step({name: "Distribution", requiredRole: Workflow.Role.Distributor, deliverableHash: keccak256("step-1")});
  }

  function setUp() public {
    vm.prank(admin);
    workflow = new Workflow(admin, _steps());
  }

  function test_ConstructorSetsAdminAndSteps() public view {
    assertEq(workflow.admin(), admin);
    assertEq(workflow.stepCount(), 2);
    Workflow.Step[] memory steps = workflow.getSteps();
    assertEq(steps[0].name, "Origin");
    assertEq(uint8(steps[1].requiredRole), uint8(Workflow.Role.Distributor));
  }

  function test_RevertWhen_NoSteps() public {
    Workflow.Step[] memory empty = new Workflow.Step[](0);
    vm.expectRevert("Workflow: at least one step is required");
    new Workflow(admin, empty);
  }

  function test_RegisterParticipant() public {
    vm.prank(admin);
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
    assertEq(uint8(workflow.authorizedParticipants(manufacturer)), uint8(Workflow.Role.Manufacturer));
  }

  function test_RevertWhen_NonAdminRegistersParticipant() public {
    vm.prank(manufacturer);
    vm.expectRevert("Workflow: caller is not admin");
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
  }

  function test_RevokeParticipant() public {
    vm.startPrank(admin);
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
    workflow.revokeParticipant(manufacturer);
    vm.stopPrank();
    assertEq(uint8(workflow.authorizedParticipants(manufacturer)), uint8(Workflow.Role.None));
  }

  function test_CreateBatch() public {
    vm.startPrank(admin);
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
    workflow.createBatch(1, manufacturer);
    vm.stopPrank();

    (address currentCustodian, uint256 currentStepIndex, Workflow.BatchStatus status, ) = workflow.batches(1);
    assertEq(currentCustodian, manufacturer);
    assertEq(currentStepIndex, 0);
    assertEq(uint8(status), uint8(Workflow.BatchStatus.Active));
  }

  function test_RevertWhen_CreateBatchWithUnauthorizedCustodian() public {
    vm.prank(admin);
    vm.expectRevert("Workflow: initialCustodian lacks required role for step 0");
    workflow.createBatch(1, manufacturer);
  }

  function test_RevertWhen_CreateBatchTwice() public {
    vm.startPrank(admin);
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
    workflow.createBatch(1, manufacturer);
    vm.expectRevert("Workflow: batch already exists");
    workflow.createBatch(1, manufacturer);
    vm.stopPrank();
  }

  function test_TransferCustody() public {
    uint256 manufacturerKey = 0xA11CE1;
    address signerManufacturer = vm.addr(manufacturerKey);

    vm.startPrank(admin);
    workflow.registerParticipant(signerManufacturer, Workflow.Role.Manufacturer);
    workflow.registerParticipant(distributor, Workflow.Role.Distributor);
    workflow.createBatch(1, signerManufacturer);
    vm.stopPrank();

    bytes32 deliverableHash = keccak256("deliverable");
    bytes32 dataHash = keccak256("data");
    bytes32 digest = keccak256(abi.encodePacked(address(workflow), block.chainid, uint256(1), distributor, deliverableHash, dataHash));
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(manufacturerKey, ethSignedMessageHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    workflow.transferCustody(1, distributor, deliverableHash, dataHash, signature);

    (address currentCustodian, uint256 currentStepIndex, , ) = workflow.batches(1);
    assertEq(currentCustodian, distributor);
    assertEq(currentStepIndex, 1);
  }

  function test_RevertWhen_TransferSignedByWrongParty() public {
    uint256 manufacturerKey = 0xA11CE1;
    uint256 strangerKey = 0xBAD;
    address signerManufacturer = vm.addr(manufacturerKey);

    vm.startPrank(admin);
    workflow.registerParticipant(signerManufacturer, Workflow.Role.Manufacturer);
    workflow.registerParticipant(distributor, Workflow.Role.Distributor);
    workflow.createBatch(1, signerManufacturer);
    vm.stopPrank();

    bytes32 deliverableHash = keccak256("deliverable");
    bytes32 dataHash = keccak256("data");
    bytes32 digest = keccak256(abi.encodePacked(address(workflow), block.chainid, uint256(1), distributor, deliverableHash, dataHash));
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(strangerKey, ethSignedMessageHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.expectRevert("Workflow: signer is not the current custodian");
    workflow.transferCustody(1, distributor, deliverableHash, dataHash, signature);
  }

  function test_ReportConditionBreachCompromisesBatch() public {
    vm.startPrank(admin);
    workflow.registerParticipant(manufacturer, Workflow.Role.Manufacturer);
    workflow.createBatch(1, manufacturer);
    workflow.reportCondition(1, keccak256("temperature_celsius"), 30, 8, block.timestamp);
    vm.stopPrank();

    (, , Workflow.BatchStatus status, ) = workflow.batches(1);
    assertEq(uint8(status), uint8(Workflow.BatchStatus.Compromised));
  }

  function test_RevertWhen_TransferAfterCompromised() public {
    uint256 manufacturerKey = 0xA11CE1;
    address signerManufacturer = vm.addr(manufacturerKey);

    vm.startPrank(admin);
    workflow.registerParticipant(signerManufacturer, Workflow.Role.Manufacturer);
    workflow.registerParticipant(distributor, Workflow.Role.Distributor);
    workflow.createBatch(1, signerManufacturer);
    workflow.reportCondition(1, keccak256("temperature_celsius"), 30, 8, block.timestamp);
    vm.stopPrank();

    bytes32 deliverableHash = keccak256("deliverable");
    bytes32 dataHash = keccak256("data");
    bytes32 digest = keccak256(abi.encodePacked(address(workflow), block.chainid, uint256(1), distributor, deliverableHash, dataHash));
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(manufacturerKey, ethSignedMessageHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    vm.expectRevert("Workflow: batch is compromised");
    workflow.transferCustody(1, distributor, deliverableHash, dataHash, signature);
  }
}
