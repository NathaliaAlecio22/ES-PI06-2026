export type TransferStatus =
  | "Confirmada"
  | "Aguardando confirmação"
  | "Com ocorrência";

export type StorageStatus =
  | "Em transporte"
  | "Armazenado"
  | "Pendente";

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

export interface TransferLotOption {
  id: string;
  code: string;
  product: string;
  quantity: string;
  unit: string;
  currentOwner: string;
  location: string;
  nextDestinationId?: string | null;
  workflowManaged?: boolean;
  workflowComplete?: boolean;
}

export interface TransferParticipantOption {
  id: string;
  name: string;
  type: string | null;
}

export interface TransferOptions {
  lots: TransferLotOption[];
  participants: TransferParticipantOption[];
}

export interface TransferStatsData {
  total: number;
  pending: number;
  confirmed: number;
  withIssue: number;
}