import type { UserRole, UserStatus, OrganizationUser } from "@provenance/shared";

export type OrganizationUserRole = UserRole;
export type OrganizationUserStatus = UserStatus;
export type { OrganizationUser };

export type ParticipantStatus = "ACTIVE" | "PENDING" | "INACTIVE";

export type ParticipantType =
  | "Fabricante"
  | "Distribuidor"
  | "Transportadora"
  | "Centro de armazenamento"
  | "Varejista";

export interface Participant {
  id: string;
  name: string;
  type: string;
  cnpj: string;
  person: string;
  email: string;
  phone: string;
  lots: number;
  status: ParticipantStatus;
}

export interface ParticipantFormData {
  name: string;
  cnpj: string;
  type: ParticipantType;
  person: string;
  email: string;
  phone: string;
}

export interface ParticipantStats {
  total: number;
  active: number;
  pendingInvitations: number;
  lots: number;
}

export interface ParticipantsResponse {
  participants: Participant[];
  stats: ParticipantStats;
  permissions: { canManageParticipants: boolean };
}
