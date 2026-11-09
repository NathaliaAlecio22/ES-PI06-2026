export type TransferStatus =
  | "Confirmada"
  | "Em andamento"
  | "Aguardando confirmação"
  | "Com ocorrência";

export type StorageStatus = "Em transporte" | "Armazenado";

export interface Transfer {
  id: string;
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
}

export interface NewTransferData {
  product: string;
  lot: string;
  destination: string;
  location: string;
  date: string;
  time: string;
  temperature: string;
  humidity: string;
  notes: string;
}