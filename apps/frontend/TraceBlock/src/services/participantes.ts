import type { RegisterParticipantRequest } from "@provenance/shared";

export type CadastroParticipante = RegisterParticipantRequest;

type CadastroResponse = {
  message: string;
  errors?: Array<{ field: string; message: string }>;
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
  .replace(/\/$/, "");

async function readJson<T>(response: Response): Promise<T> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      `A API respondeu HTTP ${response.status} sem JSON. Verifique se o backend está em execução e se a rota de cadastro existe.`,
    );
  }

  return response.json() as Promise<T>;
}

export async function cadastrarParticipante(
  cadastro: CadastroParticipante,
): Promise<CadastroResponse> {
  const response = await fetch(`${apiUrl}/participantes/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cadastro),
  });
  const result = await readJson<CadastroResponse>(response);

  if (!response.ok) {
    throw new Error(
      result.errors?.[0]?.message ||
        result.message ||
        "Não foi possível concluir o cadastro.",
    );
  }

  return result;
}
