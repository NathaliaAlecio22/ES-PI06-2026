export type ParticipantStatus =
  | "Autorizado"
  | "Aguardando validação"
  | "Suspenso";

export type ParticipantType =
  | "Fabricante"
  | "Transportadora"
  | "Centro de armazenamento"
  | "Distribuidor";

export interface Participant {
  id: string;
  initials: string;
  name: string;
  type: ParticipantType;
  cnpj: string;
  person: string;
  email: string;
  phone: string;
  address: string;
  digitalId: string;
  lots: number;
  status: ParticipantStatus;
}

export interface ParticipantFormData {
  name: string;
  cnpj: string;
  type: string;
  person: string;
  email: string;
  phone: string;
  address: string;
  digitalId: string;
}