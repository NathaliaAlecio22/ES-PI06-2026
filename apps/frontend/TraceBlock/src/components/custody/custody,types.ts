export type CustodyStepState = "done" | "current" | "pending";

export interface CustodyStep {
  id: string;
  state: CustodyStepState;
  org: string;
  role: string;
  person: string;
  location: string;
  date: string;
  type: string;
  hash: string;
}