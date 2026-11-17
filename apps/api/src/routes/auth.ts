
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../utils/password.js";
import { gerarToken, verificarToken } from "../utils/jwt.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email().transform((email) =>
    email.trim().toLowerCase()
  ),
  senha: z.string().min(1),
});

router.get("/me", async (req, res) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ message: "Autenticação necessária." });
  }

  let payload;
  try {
    payload = verificarToken(match[1]);
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }

  let usuarioId: bigint;
  try {
    usuarioId = BigInt(payload.usuarioId);
  } catch {
    return res.status(401).json({ message: "Sessão inválida ou expirada." });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { participante: true },
    });

    if (!usuario || !usuario.participante_id) {
      return res.status(401).json({ message: "Sessão inválida ou expirada." });
    }

    if (!usuario.participante?.ativo) {
      return res.status(403).json({
        message: "Sua organização está desativada. Entre em contato com o suporte.",
      });
    }

    return res.status(200).json({
      usuario: {
        id: usuario.id.toString(),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        participanteId: usuario.participante_id.toString(),
        empresa: usuario.participante.nome,
      },
    });
  } catch (error) {
    console.error("Erro ao validar sessão:", error);
    return res.status(500).json({
      message: "Erro interno ao validar sessão.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Informe um e-mail válido e sua senha.",
      });
    }

    const { email, senha } = validation.data;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        participante: true,
      },
    });

    if (!usuario || !(await verifyPassword(senha, usuario.senha_hash))) {
      return res.status(401).json({
        message: "E-mail ou senha incorretos.",
      });
    }

    if (!usuario.participante?.ativo) {
      return res.status(403).json({
        message: "Sua organização está desativada. Entre em contato com o suporte.",
      });
    }

    if (!usuario.participante_id) {
      return res.status(403).json({
        message: "Usuário não está vinculado a uma organização.",
      });
    }

    // Gera o JWT
    const token = gerarToken({
      usuarioId: usuario.id.toString(),
      participanteId: usuario.participante_id.toString(),
      perfil: usuario.perfil,
    });

    return res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id.toString(),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        participanteId: usuario.participante_id.toString(),
        empresa: usuario.participante.nome,
      },
    });

  } catch (error) {
    console.error("Erro no login:", error);

    return res.status(500).json({
      message: "Erro interno ao realizar login.",
    });
  }
});

export default router;