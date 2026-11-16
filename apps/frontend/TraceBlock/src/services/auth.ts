
export type LoginCredentials = {
  email: string;
  senha: string;
};

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  participanteId: string;
  empresa: string;
};

export type LoginResponse = {
  message: string;
  token: string;
  usuario: UsuarioAutenticado;
};

const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "");

export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  const response = await fetch(`${apiUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      senha: credentials.senha,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Não foi possível realizar o login."
    );
  }

  if (!result.token || !result.usuario) {
    throw new Error("Resposta de autenticação inválida.");
  }

  // Armazena o JWT e os dados básicos do usuário
  sessionStorage.setItem("traceblock_token", result.token);
  sessionStorage.setItem(
    "traceblock_usuario",
    JSON.stringify(result.usuario)
  );

  return result as LoginResponse;
}

export function logout() {
  sessionStorage.removeItem("traceblock_token");
  sessionStorage.removeItem("traceblock_usuario");
}

export function getToken(): string | null {
  return sessionStorage.getItem("traceblock_token");
}

export function getUsuario(): UsuarioAutenticado | null {
  const usuario = sessionStorage.getItem("traceblock_usuario");

  if (!usuario) return null;

  try {
    return JSON.parse(usuario) as UsuarioAutenticado;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken() && getUsuario());
}

// Função para fazer requisições que exigem autenticação
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });
}

// Consulta o backend para confirmar se o token ainda é válido
export async function buscarUsuarioAutenticado(): Promise<UsuarioAutenticado> {
  const response = await apiFetch("/me");

  if (!response.ok) {
    logout();
    throw new Error("Sessão inválida ou expirada.");
  }

  const result = await response.json();

  if (!result.usuario) {
    logout();
    throw new Error("Não foi possível validar sua sessão.");
  }

  sessionStorage.setItem(
    "traceblock_usuario",
    JSON.stringify(result.usuario)
  );

  return result.usuario as UsuarioAutenticado;
}
