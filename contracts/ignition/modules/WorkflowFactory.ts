import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys the single `WorkflowFactory` instance apps/api talks to (WORKFLOW_FACTORY_ADDRESS
 * in apps/api/.env). Enterprise-specific `Workflow` instances are created later by calling
 * `createWorkflow` on this factory.
 */
export default buildModule("WorkflowFactoryModule", (m) => {
  const factory = m.contract("WorkflowFactory");

  return { factory };
});
