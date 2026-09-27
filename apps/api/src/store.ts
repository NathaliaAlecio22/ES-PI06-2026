import { randomUUID } from "node:crypto";
import { Batch, Workflow } from "./types";

export const workflows = new Map<string, Workflow>();
export const batches = new Map<string, Batch>();

export function createId(): string {
  return randomUUID();
}

export function resetStore(): void {
  workflows.clear();
  batches.clear();
}