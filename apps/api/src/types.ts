export type WorkflowStep = {
  name: string;
  requiredRole: string;
  specificationHash: string;
};

export type Participant = {
  address: string;
  role: string;
};

export type Workflow = {
  id: string;
  name: string;
  adminAddress: string;
  steps: WorkflowStep[];
  participants: Participant[];
  createdAt: string;
};

export type Transfer = {
  id: string;
  from: string;
  to: string;
  stepIndex: number;
  locationReference?: string;
  conditionReferences: string[];
  deliverableHash: string;
  signature: string;
  createdAt: string;
};

export type Batch = {
  id: string;
  workflowId: string;
  currentCustodian: string;
  currentStepIndex: number;
  status: "ACTIVE" | "COMPROMISED";
  transfers: Transfer[];
  createdAt: string;
};