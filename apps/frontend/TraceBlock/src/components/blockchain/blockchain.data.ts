export type TransactionStatus =
  | "Confirmada"
  | "Em análise"
  | "Falhou";

export interface Transaction {
  hash: string;
  block: string;
  event: string;
  item: string;
  party: string;
  date: string;
  status: TransactionStatus;
  from?: string;
  to?: string;
  txHash?: string;
  previousBlockHash?: string;
  contractAddress?: string;
  confirmations?: number;
  location?: string;
}

export interface Block {
  number: string;
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