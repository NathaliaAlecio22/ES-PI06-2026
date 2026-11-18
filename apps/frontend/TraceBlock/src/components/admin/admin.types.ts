export type AdminTab = "Usuários" | "Organizações" | "Perfis e permissões" | "Atividades";

export type UserStatus = "Ativo" | "Pendente" | "Inativo";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  lastAccess: string;
  status: UserStatus;
}

export interface Organization {
  id: string;
  name: string;
  cnpj: string;
  type: string;
  city: string;
  status: UserStatus;
}

export interface AccessRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}