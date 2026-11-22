export type CustodyStepState = "done" | "current" | "pending" | "issue";

export interface CustodyStep {
  id: string;
  stageName?: string;
  state: CustodyStepState;
  org: string;
  role: string;
  person: string;
  location: string;
  date: string;
  type: string;
  /** Hash da transação na blockchain; null enquanto não houver registro on-chain. */
  hash: string | null;
}

/** Lote exibido no seletor da cadeia de custódia. */
export interface CustodyLot {
  value: string;
  label: string;
  product: string;
  detail: string;
  quantity: string;
  status: string;
  currentOwner: string;
}
