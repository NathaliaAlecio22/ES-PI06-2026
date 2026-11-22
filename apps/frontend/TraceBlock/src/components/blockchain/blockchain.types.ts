export type TransactionStatus =
  | "Confirmada"
  | "Em análise"
  | "Falhou";

export interface Transaction {
  hash: string;
  block: number | null;
  event: string;
  item: string;
  party: string;
  date: string;
  status: TransactionStatus;

  // Dados complementares
  from?: string;
  to?: string;
  txHash?: string;
  previousBlockHash?: string | null;
  contractAddress?: string | null;
  confirmations?: number | null;
  location?: string;
}

export interface Block {
  number: number;
  hash: string;
  previousHash: string;
  time: string;
  timestamp: string;
  transactionsCount: number;
  active: boolean;
}

export interface BlockchainStatsData {
  totalBlocks: number;
  totalTransactions: number;
  lastBlockTime: string;
  networkStatus: "Operacional" | "Instável" | "Offline";
}

export interface BlockchainHistoryResponse {
  stats: BlockchainStatsData;
  blocks: Block[];
  transactions: Transaction[];
}