import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../utils/password.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
  senha: z.string().min(1),
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

    // A autenticação por sessão ou JWT será adicionada aqui.

    return res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: {
        id: usuario.id.toString(),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        participanteId: usuario.participante_id?.toString(),
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