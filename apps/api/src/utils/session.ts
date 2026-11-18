import type { Response } from "express";

import { prisma } from "../lib/prisma";
import type { JwtPayload } from "./jwt";

export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export function roleFromProfile(profile: string): UserRole {
  if (profile === "ADMINISTRADOR" || profile === "ADMIN") return "ADMIN";
  if (profile === "VISUALIZADOR" || profile === "VIEWER") return "VIEWER";
  return "OPERATOR";
}

export async function loadCurrentUser(
  payload: JwtPayload | undefined,
  response: Response,
) {
  if (!payload) {
    response.status(401).json({ message: "Autenticação necessária." });
    return null;
  }

  let userId: bigint;
  try {
    userId = BigInt(payload.usuarioId);
  } catch {
    response.status(401).json({ message: "Sessão inválida ou expirada." });
    return null;
  }

  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { participante: true },
  });

  if (
    !user ||
    !user.ativo ||
    !user.participante_id ||
    user.participante_id.toString() !== payload.participanteId
  ) {
    response.status(401).json({ message: "Sessão inválida ou expirada." });
    return null;
  }

  if (!user.participante?.ativo) {
    response.status(403).json({ message: "A organização está desativada." });
    return null;
  }

  return user;
}