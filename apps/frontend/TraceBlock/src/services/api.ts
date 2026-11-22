import { getToken } from "./auth";

export const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "");

type ApiErrorBody = {
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
};

/** Requisição JSON autenticada (Bearer) para a API do TraceBlock. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });

  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se o backend está em execução.`,
    );
  }

  const result = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(
      result.errors?.[0]?.message ||
        result.message ||
        result.error ||
        "Não foi possível concluir a operação.",
    );
  }

  return result;
}
