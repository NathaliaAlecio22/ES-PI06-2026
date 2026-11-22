import { apiRequest } from "./api";

export type WorkflowRole =
  | "manufacturer"
  | "distributor"
  | "carrier"
  | "distribution_center"
  | "retailer"
  | "admin";

export type WorkflowParticipantOption = {
  id: string;
  name: string;
  address: string | null;
  role: Exclude<WorkflowRole, "admin">;
};

export type WorkflowStep = {
  name: string;
  requiredRole: WorkflowRole;
  assignee: string;
  specificationHash: string;
};

export type WorkflowStepRequest = Omit<WorkflowStep, "specificationHash"> & {
  specification: string;
};

export type WorkflowDefinition = {
  id: string;
  organizationId: string;
  name: string;
  adminAddress: string;
  workflowAddress: string;
  steps: WorkflowStep[];
  participants: Array<{ address: string; role: WorkflowRole }>;
  createdAt: string;
};

export type WorkflowOptions = {
  organizationId: string;
  workflow: WorkflowDefinition | null;
  participants: WorkflowParticipantOption[];
};

export function buscarOpcoesWorkflow(): Promise<WorkflowOptions> {
  return apiRequest<WorkflowOptions>("/workflows/opcoes");
}

export function criarWorkflow(input: {
  name: string;
  steps: WorkflowStepRequest[];
}): Promise<WorkflowDefinition> {
  return apiRequest<WorkflowDefinition>("/workflows", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
