export type CadastroParticipante = {
  nomeCompleto: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  nomeOrganizacao: string;
  cnpj: string;
  tipo: string;
  cargo: string;
  aceitouTermos: boolean;
};

type CadastroResponse = {
  message: string;
  errors?: Array<{ field: string; message: string }>;
};

const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api")
  .replace(/\/$/, "");

export async function cadastrarParticipante(
  cadastro: CadastroParticipante,
): Promise<CadastroResponse> {
  const response = await fetch(`${apiUrl}/participantes/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cadastro),
  });
  const result = (await response.json()) as CadastroResponse;

  if (!response.ok) {
    throw new Error(
      result.errors?.[0]?.message ||
        result.message ||
        "Não foi possível concluir o cadastro.",
    );
  }

  return result;
}
