"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const password_js_1 = require("../utils/password.js");
const jwt_js_1 = require("../utils/jwt.js");
const node_crypto_1 = require("node:crypto");
const email_service_1 = require("../service/email.service");
const password_js_2 = require("../utils/password.js");
const router = (0, express_1.Router)();
function gerarCodigo() {
    return (0, node_crypto_1.randomInt)(100000, 1000000).toString();
}
function gerarHashCodigo(codigo) {
    const secret = process.env.RESET_CODE_SECRET;
    if (!secret) {
        throw new Error("RESET_CODE_SECRET não configurado.");
    }
    return (0, node_crypto_1.createHmac)("sha256", secret)
        .update(codigo)
        .digest("hex");
}
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email().transform((email) => email.trim().toLowerCase()),
    senha: zod_1.z.string().min(1),
});
router.post("/forgot-password", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email().transform((value) => value.trim().toLowerCase()),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Informe um e-mail válido.",
            });
        }
        const { email } = parsed.data;
        const usuario = await prisma_1.prisma.usuario.findUnique({
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
        await prisma_1.prisma.codigoRecuperacaoSenha.updateMany({
            where: {
                email,
                usado: false,
            },
            data: {
                usado: true,
            },
        });
        await prisma_1.prisma.codigoRecuperacaoSenha.create({
            data: {
                email,
                codigoHash,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        });
        try {
            await (0, email_service_1.enviarCodigoRecuperacao)(email, codigo);
        }
        catch (error) {
            await prisma_1.prisma.codigoRecuperacaoSenha.updateMany({
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
    }
    catch (error) {
        console.error("Erro ao solicitar recuperação:", error);
        return res.status(500).json({
            message: "Não foi possível enviar o código. Tente novamente.",
        });
    }
});
router.post("/verify-reset-code", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            codigo: zod_1.z.string().regex(/^\d{6}$/, "Código inválido."),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Informe o e-mail e o código de 6 dígitos.",
            });
        }
        const email = parsed.data.email.trim().toLowerCase();
        const codigoHash = gerarHashCodigo(parsed.data.codigo);
        const registro = await prisma_1.prisma.codigoRecuperacaoSenha.findFirst({
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
            await prisma_1.prisma.codigoRecuperacaoSenha.update({
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
    }
    catch (error) {
        console.error("Erro ao validar código:", error);
        return res.status(500).json({
            message: "Erro ao validar o código.",
        });
    }
});
router.post("/reset-password", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            codigo: zod_1.z.string().regex(/^\d{6}$/),
            senha: zod_1.z.string().min(8).max(128),
            confirmarSenha: zod_1.z.string(),
        }).refine((data) => data.senha === data.confirmarSenha, {
            path: ["confirmarSenha"],
            message: "As senhas não coincidem.",
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Dados inválidos. Verifique as senhas informadas.",
            });
        }
        const { senha, email: emailInformado, codigo } = parsed.data;
        const email = emailInformado.trim().toLowerCase();
        const codigoHash = gerarHashCodigo(codigo);
        const registro = await prisma_1.prisma.codigoRecuperacaoSenha.findFirst({
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
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: { email },
        });
        if (!usuario) {
            return res.status(400).json({
                message: "Não foi possível recuperar esta conta.",
            });
        }
        const senhaHash = await (0, password_js_2.hashPassword)(senha);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.usuario.update({
                where: { id: usuario.id },
                data: {
                    senha_hash: senhaHash,
                },
            }),
            prisma_1.prisma.codigoRecuperacaoSenha.update({
                where: { id: registro.id },
                data: {
                    usado: true,
                },
            }),
            // Invalida também outros códigos ainda ativos.
            prisma_1.prisma.codigoRecuperacaoSenha.updateMany({
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
    }
    catch (error) {
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
        payload = (0, jwt_js_1.verificarToken)(match[1]);
    }
    catch {
        return res.status(401).json({ message: "Sessão inválida ou expirada." });
    }
    let usuarioId;
    try {
        usuarioId = BigInt(payload.usuarioId);
    }
    catch {
        return res.status(401).json({ message: "Sessão inválida ou expirada." });
    }
    try {
        const usuario = await prisma_1.prisma.usuario.findUnique({
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
    }
    catch (error) {
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
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: { email },
            include: {
                participante: true,
            },
        });
        if (!usuario ||
            !usuario.ativo ||
            !(await (0, password_js_1.verifyPassword)(senha, usuario.senha_hash))) {
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
        const token = (0, jwt_js_1.gerarToken)({
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
    }
    catch (error) {
        console.error("Erro no login:", error);
        return res.status(500).json({
            message: "Erro interno ao realizar login.",
        });
    }
});
exports.default = router;
