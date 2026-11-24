import { getToken } from "./auth";
import type {
  OrganizationUser,
  OrganizationUserRole,
} from "../components/participantes/participantes.types";

export type OrganizationUserStats = {
  total: number;
  active: number;
  administrators: number;
  pendingInvitations: number;
};

export type OrganizationUsersResult = {
  users: OrganizationUser[];
  organization: {
    name: string;
    type: string | null;
  };
  activities: OrganizationActivity[];
  stats: OrganizationUserStats;
  permissions: { canManageUsers: boolean };
};

export type OrganizationActivity = {
  id: string;
  user: string;
  action: string;
  description: string;
  occurredAt: string;
};

export type OrganizationUserInput = {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: OrganizationUserRole;
};

export type OrganizationWallet = {
  name: string;
  address: string | null;
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
  .replace(/\/$/, "");

async function organizationRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiUrl}/organizacao${path}`, {
    ...options,
    headers,
  });

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se o backend está em execução.`,
    );
  }

  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Não foi possível concluir a operação.");
  }

  return result;
}

export function listarUsuariosOrganizacao(): Promise<OrganizationUsersResult> {
  return organizationRequest<OrganizationUsersResult>("/usuarios");
}

export function buscarCarteiraOrganizacao(): Promise<OrganizationWallet> {
  return organizationRequest<OrganizationWallet>("/carteira");
}

export function salvarCarteiraOrganizacao(address: string): Promise<OrganizationWallet> {
  return organizationRequest<OrganizationWallet>("/carteira", {
    method: "PATCH",
    body: JSON.stringify({ address }),
  });
}

export async function convidarUsuario(
  input: OrganizationUserInput,
): Promise<OrganizationUser> {
  const result = await organizationRequest<{ invitation: OrganizationUser }>(
    "/usuarios/convites",
    { method: "POST", body: JSON.stringify(input) },
  );
  return result.invitation;
}

export async function atualizarUsuarioOrganizacao(
  id: string,
  input: OrganizationUserInput,
): Promise<OrganizationUser> {
  const result = await organizationRequest<{ user: OrganizationUser }>(
    `/usuarios/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        name: input.name,
        phone: input.phone,
        department: input.department,
        role: input.role,
      }),
    },
  );
  return result.user;
}

export function alterarStatusUsuario(id: string, active: boolean) {
  return organizationRequest<{ id: string; status: string }>(
    `/usuarios/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ active }) },
  );
}

export function cancelarConviteUsuario(id: string) {
  return organizationRequest<{ message: string }>(
    `/usuarios/convites/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function aceitarConviteUsuario(token: string, password: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const response = await fetch(`${apiUrl}/organizacao/convites/aceitar`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token, password }),
  });

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se o backend está em execução.`,
    );
  }

  const result = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Não foi possível aceitar o convite.");
  }
  return result;
}
