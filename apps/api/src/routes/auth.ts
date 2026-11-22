
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { verifyPassword } from "../utils/password.js";
import { gerarToken, verificarToken } from "../utils/jwt.js";

import { createHmac, randomInt } from "node:crypto";
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  verifyResetCodeRequestSchema,
} from "@provenance/shared";
import { enviarCodigoRecuperacao } from "../service/email.service";
import { hashPassword } from "../utils/password.js";

const router = Router();

function gerarCodigo(): string {
    return randomInt(100000, 1000000).toString();
}

function gerarHashCodigo(codigo: string): string {
  return createHmac("sha256", env.RESET_CODE_SECRET)
    .update(codigo)
    .digest("hex");
}

router.post("/forgot-password", async (req, res) => {
  try {
    const parsed = forgotPasswordRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Informe um e-mail válido.",
      });
    }

    const { email } = parsed.data;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    // Não revela se o e-mail está cadastrado.
    if (!usuario) {
      return res.status(200).json({
        message: "Se o e-mail estiver cadastrado, você receberá um código.",
      });
    }

    const codigo = gerarCodigo();
    const codigoHash = gerarHashCodigo(codigo);

    // Invalida códigos anteriores desse e-mail.
    await prisma.codigoRecuperacaoSenha.updateMany({
      where: {
        email,
        usado: false,
      },
      data: {
        usado: true,
      },
    });

    await prisma.codigoRecuperacaoSenha.create({
      data: {
        email,
        codigoHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await enviarCodigoRecuperacao(email, codigo);
    } catch (error) {
      await prisma.codigoRecuperacaoSenha.updateMany({
        where: {
          email,
          codigoHash,
          usado: false,
        },
        data: {
          usado: true,
        },
      });

      throw error;
    }

    return res.status(200).json({
      message: "Se o e-mail estiver cadastrado, você receberá um código.",
    });
  } catch (error) {
    console.error("Erro ao solicitar recuperação:", error);

    return res.status(500).json({
      message: "Não foi possível enviar o código. Tente novamente.",
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const parsed = verifyResetCodeRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Informe o e-mail e o código de 6 dígitos.",
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const codigoHash = gerarHashCodigo(parsed.data.codigo);

    const registro = await prisma.codigoRecuperacaoSenha.findFirst({
      where: {
        email,
        usado: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!registro || registro.tentativas >= 5) {
      return res.status(400).json({
        message: "Código inválido ou expirado.",
      });
    }

    if (registro.codigoHash !== codigoHash) {
      await prisma.codigoRecuperacaoSenha.update({
        where: { id: registro.id },
        data: {
          tentativas: {
            increment: 1,
          },
        },
      });

      return res.status(400).json({
        message: "Código incorreto.",
      });
    }

    return res.status(200).json({
      message: "Código validado com sucesso.",
      valid: true,
    });
  } catch (error) {
    console.error("Erro ao validar código:", error);

    return res.status(500).json({
      message: "Erro ao validar o código.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const parsed = resetPasswordRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos. Verifique as senhas informadas.",
      });
    }

    const { senha, email: emailInformado, codigo } = parsed.data;
    const email = emailInformado.trim().toLowerCase();
    const codigoHash = gerarHashCodigo(codigo);

    const registro = await prisma.codigoRecuperacaoSenha.findFirst({
      where: {
        email,
        codigoHash,
        usado: false,
        tentativas: {
          lt: 5,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!registro) {
      return res.status(400).json({
        message: "Código inválido ou expirado. Solicite um novo código.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(400).json({
        message: "Não foi possível recuperar esta conta.",
      });
    }

    const senhaHash = await hashPassword(senha);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          senha_hash: senhaHash,
        },
      }),

      prisma.codigoRecuperacaoSenha.update({
        where: { id: registro.id },
        data: {
          usado: true,
        },
      }),

      // Invalida também outros códigos ainda ativos.
      prisma.codigoRecuperacaoSenha.updateMany({
        where: {
          email,
          usado: false,
        },
        data: {
          usado: true,
        },
      }),
    ]);

    return res.status(200).json({
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);

    return res.status(500).json({
      message: "Não foi possível redefinir sua senha.",
    });
  }
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

    if (!usuario || !usuario.ativo || !usuario.participante_id) {
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
        cargo: usuario.cargo,
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
    const validation = loginRequestSchema.safeParse(req.body);

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

    if (
      !usuario ||
      !usuario.ativo ||
      !(await verifyPassword(senha, usuario.senha_hash))
    ) {
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
        cargo: usuario.cargo,
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