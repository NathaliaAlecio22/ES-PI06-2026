"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/me", auth_middleware_1.autenticar, async (req, res) => {
    try {
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: {
                id: BigInt(req.usuario.usuarioId),
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
    }
    catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return res.status(500).json({
            message: "Erro ao consultar usuário.",
        });
    }
});
exports.default = router;
