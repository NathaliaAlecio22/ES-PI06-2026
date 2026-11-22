import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type JwtPayload = {
  usuarioId: string;
  participanteId: string;
  perfil: string;
};

export function gerarToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "8h",
    issuer: "traceblock-api",
  });
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "usuarioId" in value &&
    typeof value.usuarioId === "string" &&
    "participanteId" in value &&
    typeof value.participanteId === "string" &&
    "perfil" in value &&
    typeof value.perfil === "string"
  );
}

export function verificarToken(token: string): JwtPayload {
  const payload: unknown = jwt.verify(token, env.JWT_SECRET, {
    issuer: "traceblock-api",
  });

  if (!isJwtPayload(payload)) {
    throw new Error("Token JWT inválido.");
  }

  return payload;
}
