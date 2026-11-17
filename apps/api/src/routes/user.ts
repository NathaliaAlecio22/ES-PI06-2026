
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middlewares/auth.middleware";

const router = Router();

router.get("/me", autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: BigInt(req.usuario!.usuarioId),
      },
      include: {
        participante: true,
      },
    });

    if (!usuario || !usuario.participante?.ativo) {
      return res.status(401).json({
        message: "Usuário não encontrado ou organização desativada.",
      });
    }

    return res.json({
      usuario: {
        id: usuario.id.toString(),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        cargo: usuario.cargo,
        participanteId: usuario.participante_id?.toString(),
        empresa: usuario.participante.nome,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);

    return res.status(500).json({
      message: "Erro ao consultar usuário.",
    });
  }
});

export default router;