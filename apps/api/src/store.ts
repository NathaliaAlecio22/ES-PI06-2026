// NOTE: This is an in-memory store (data is lost on restart).
// TODO: Persist workflows and batches to the project database once
// backend persistence is implemented.
import { randomUUID } from "node:crypto";

import type { Batch, Workflow } from "@provenance/shared";

export const workflows = new Map<string, Workflow>();
export const batches = new Map<string, Batch>();

export function createId(): string {
  return randomUUID();
}

export function resetStore(): void {
  workflows.clear();
  batches.clear();
}
