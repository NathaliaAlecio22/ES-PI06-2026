// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {Test} from "forge-std/Test.sol";
import {WorkflowFactory} from "./WorkflowFactory.sol";
import {Workflow} from "./Workflow.sol";

contract WorkflowFactoryTest is Test {
  WorkflowFactory factory;

  function setUp() public {
    factory = new WorkflowFactory();
  }

  function _steps() internal pure returns (Workflow.Step[] memory steps) {
    steps = new Workflow.Step[](1);
    steps[0] = Workflow.Step({name: "Origin", requiredRole: Workflow.Role.Manufacturer, deliverableHash: keccak256("step-0")});
  }

  function test_CreateWorkflowSetsCallerAsAdmin() public {
    address caller = address(0xDEADBEEF);
    vm.prank(caller);
    address workflowAddress = factory.createWorkflow(_steps());

    assertEq(Workflow(workflowAddress).admin(), caller);
    assertEq(factory.workflowCount(), 1);
    assertEq(factory.deployedWorkflows(0), workflowAddress);
  }

  function test_EmitsWorkflowCreated() public {
    address caller = address(0xDEADBEEF);
    vm.prank(caller);
    vm.expectEmit(false, true, false, false, address(factory));
    emit WorkflowFactory.WorkflowCreated(address(0), caller, block.timestamp);
    factory.createWorkflow(_steps());
  }
}
