export type TransactionStatus = "Confirmada" | "Em análise";

export interface Transaction {
  hash: string;
  block: string;
  event: string;
  item: string;
  party: string;
  date: string;
  status: TransactionStatus;
}

export interface Block {
  number: string;
  time: string;
  active: boolean;
}