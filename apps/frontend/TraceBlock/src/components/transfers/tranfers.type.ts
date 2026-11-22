import type {
  TransferLotOption,
  TransferParticipantOption,
  TransferStats,
} from "@provenance/shared";

export type { TransferLotOption, TransferParticipantOption };

export type TransferStatus =
  | "Confirmada"
  | "Aguardando confirmação"
  | "Com ocorrência";

export type StorageStatus =
  | "Em transporte"
  | "Armazenado"
  | "Pendente"
  | "Com ocorrência";

export interface Transfer {
  id: string;
  rawId: string;

  product: string;
  lot: string;

  previousOwner: string;
  newOwner: string;

  date: string;
  time: string;

  status: TransferStatus;
  storageStatus: StorageStatus;

  hash: string;
  location: string;
  quantity: string;

  temperature?: string;
  humidity?: string;
  notes?: string;

  canRespond: boolean;
}

export interface NewTransferData {
  lot: string;
  destinationId: string;
  location: string;
  temperature: string;
  humidity: string;
  notes: string;
}

export interface TransferOptions {
  lots: TransferLotOption[];
  participants: TransferParticipantOption[];
}

export type TransferStatsData = TransferStats;