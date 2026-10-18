// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import {Workflow} from "./Workflow.sol";

/**
 * @title WorkflowFactory
 * @notice Deploys one `Workflow` instance per enterprise — `createWorkflow` fixes
 * the workflow's shape, and `msg.sender` automatically becomes that instance's admin
 */
contract WorkflowFactory {
  /// @notice Convenience list of every workflow this factory has deployed. apps/api does not
  /// rely on this — it discovers workflows solely via `WorkflowCreated`
  /// this is here for manual inspection/debugging (e.g. a block explorer or console).
  address[] public deployedWorkflows;

  event WorkflowCreated(address indexed workflow, address indexed admin, uint256 timestamp);

  /**
   * @notice Deploys a new `Workflow` with the given step shape. The caller becomes that
   * workflow's admin.
   * @dev Note that inside `Workflow`'s constructor, `msg.sender` would resolve to this factory
   * (the contract performing the `new` call), not the original caller — so the intended admin
   * is passed explicitly instead of relying on `Workflow` reading `msg.sender` itself.
   */
  function createWorkflow(Workflow.Step[] calldata steps) external returns (address workflow) {
    Workflow deployed = new Workflow(msg.sender, steps);
    workflow = address(deployed);

    deployedWorkflows.push(workflow);

    emit WorkflowCreated(workflow, msg.sender, block.timestamp);
  }

  function workflowCount() external view returns (uint256) {
    return deployedWorkflows.length;
  }
}
