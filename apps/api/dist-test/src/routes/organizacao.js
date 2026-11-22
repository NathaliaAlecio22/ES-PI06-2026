"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const blockchain_1 = require("../blockchain");
const env_1 = require("../config/env");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const email_service_1 = require("../service/email.service");
const password_js_1 = require("../utils/password.js");
const userRoles = ["ADMIN", "OPERATOR", "VIEWER"];
const roleToProfile = {
    ADMIN: "ADMINISTRADOR",
    OPERATOR: "OPERADOR",
    VIEWER: "VISUALIZADOR",
};
const inviteSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(150),
    email: zod_1.z.string().trim().email().max(150).transform((email) => email.toLowerCase()),
    phone: zod_1.z.string().trim().max(30).nullable().optional(),
    department: zod_1.z.string().trim().min(2).max(100),
    role: zod_1.z.enum(userRoles),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(150),
    phone: zod_1.z.string().trim().max(30).nullable().optional(),
    department: zod_1.z.string().trim().min(2).max(100),
    role: zod_1.z.enum(userRoles),
});
const walletSchema = zod_1.z.object({
    address: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Informe um endereço de carteira válido."),
});
const acceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(32).max(256),
    password: zod_1.z.string().min(8).max(128),
});
const router = (0, express_1.Router)();
router.get("/carteira", auth_middleware_1.autenticar, async (request, response) => {
    try {
        const user = await loadCurrentUser(request.usuario, response);
        if (!user?.participante_id || !user.participante)
            return;
        response.json({
            name: user.participante.nome,
            address: user.participante.wallet_address,
        });
    }
    catch (error) {
        console.error("Erro ao carregar a carteira da organização:", error);
        response.status(500).json({ message: "Não foi possível carregar a carteira da organização." });
    }
});
router.patch("/carteira", auth_middleware_1.autenticar, async (request, response) => {
    const parsed = walletSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Carteira inválida." });
        return;
    }
    try {
        const user = await loadAdministrator(request.usuario, response);
        if (!user?.participante_id)
            return;
        const currentWallet = user.participante?.wallet_address;
        if (env_1.env.WORKFLOW_FACTORY_ADDRESS && currentWallet) {
            const workflowAddress = await (0, blockchain_1.getWorkflowForOrganization)(user.participante_id);
            if (workflowAddress) {
                const steps = await (0, blockchain_1.getWorkflowSteps)(workflowAddress);
                const currentWalletAssigned = steps.some((step) => step.assignee.toLowerCase() === currentWallet.toLowerCase());
                if (currentWalletAssigned &&
                    parsed.data.address.toLowerCase() !== currentWallet.toLowerCase()) {
                    response.status(409).json({
                        message: "A carteira está atribuída a uma cadeia ativa e não pode ser substituída.",
                    });
                    return;
                }
            }
        }
        const participant = await prisma_1.prisma.participante.update({
            where: { id: user.participante_id },
            data: { wallet_address: parsed.data.address },
            select: { nome: true, wallet_address: true },
        });
        response.json({ name: participant.nome, address: participant.wallet_address });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            response.status(409).json({ message: "Esta carteira já está vinculada a outro participante." });
            return;
        }
        console.error("Erro ao atualizar carteira da organização:", error);
        response.status(500).json({ message: "Não foi possível atualizar a carteira da organização." });
    }
});
function hashInviteToken(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
}
function roleFromProfile(profile) {
    if (profile === "ADMINISTRADOR" || profile === "ADMIN")
        return "ADMIN";
    if (profile === "VISUALIZADOR" || profile === "VIEWER")
        return "VIEWER";
    return "OPERATOR";
}
async function loadCurrentUser(payload, response) {
    if (!payload) {
        response.status(401).json({ message: "Autenticação necessária." });
        return null;
    }
    let userId;
    try {
        userId = BigInt(payload.usuarioId);
    }
    catch {
        response.status(401).json({ message: "Sessão inválida ou expirada." });
        return null;
    }
    const user = await prisma_1.prisma.usuario.findUnique({
        where: { id: userId },
        include: { participante: true },
    });
    if (!user ||
        !user.ativo ||
        !user.participante_id ||
        user.participante_id.toString() !== payload.participanteId) {
        response.status(401).json({ message: "Sessão inválida ou expirada." });
        return null;
    }
    if (!user.participante?.ativo) {
        response.status(403).json({ message: "A organização está desativada." });
        return null;
    }
    return user;
}
async function loadAdministrator(payload, response) {
    const user = await loadCurrentUser(payload, response);
    if (!user)
        return null;
    if (roleFromProfile(user.perfil) !== "ADMIN") {
        response.status(403).json({
            message: "Somente administradores podem gerenciar usuários.",
        });
        return null;
    }
    return user;
}
router.post("/convites/aceitar", async (request, response) => {
    const parsed = acceptInviteSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ message: "Informe um convite e senha válidos." });
        return;
    }
    const now = new Date();
    const tokenHash = hashInviteToken(parsed.data.token);
    try {
        const invitation = await prisma_1.prisma.conviteUsuario.findFirst({
            where: {
                tokenHash,
                status: "PENDENTE",
                expiraEm: { gt: now },
            },
        });
        if (!invitation) {
            response.status(400).json({
                message: "Este convite é inválido, já foi utilizado ou expirou.",
            });
            return;
        }
        const passwordHash = await (0, password_js_1.hashPassword)(parsed.data.password);
        await prisma_1.prisma.$transaction(async (transaction) => {
            const claimed = await transaction.conviteUsuario.updateMany({
                where: {
                    id: invitation.id,
                    status: "PENDENTE",
                    expiraEm: { gt: now },
                },
                data: { status: "ACEITO", aceitoEm: now },
            });
            if (claimed.count !== 1) {
                throw new Error("INVITATION_ALREADY_USED");
            }
            await transaction.usuario.create({
                data: {
                    participante_id: invitation.participanteId,
                    nome: invitation.nome,
                    email: invitation.email,
                    telefone: invitation.telefone,
                    cargo: invitation.cargo,
                    perfil: invitation.perfil,
                    senha_hash: passwordHash,
                    ativo: true,
                },
            });
        });
        response.status(201).json({
            message: "Convite aceito. Agora você pode entrar na sua conta.",
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") {
            response.status(400).json({ message: "Este convite já foi utilizado ou expirou." });
            return;
        }
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            response.status(409).json({
                message: "Este e-mail já possui uma conta. Entre em contato com o administrador.",
            });
            return;
        }
        console.error("Erro ao aceitar convite:", error);
        response.status(500).json({ message: "Não foi possível aceitar o convite." });
    }
});
router.get("/usuarios", auth_middleware_1.autenticar, async (request, response) => {
    try {
        const currentUser = await loadCurrentUser(request.usuario, response);
        if (!currentUser?.participante_id)
            return;
        const [users, invitations] = await Promise.all([
            prisma_1.prisma.usuario.findMany({
                where: { participante_id: currentUser.participante_id },
                orderBy: { id: "desc" },
            }),
            prisma_1.prisma.conviteUsuario.findMany({
                where: {
                    participanteId: currentUser.participante_id,
                    status: "PENDENTE",
                },
                orderBy: { criadoEm: "desc" },
            }),
        ]);
        const now = new Date();
        const userRows = users.map((user) => ({
            id: `user:${user.id}`,
            name: user.nome,
            email: user.email,
            phone: user.telefone,
            department: user.cargo ?? "",
            role: roleFromProfile(user.perfil),
            status: user.ativo ? "ACTIVE" : "INACTIVE",
            createdAt: null,
            canManage: roleFromProfile(currentUser.perfil) === "ADMIN",
        }));
        const inviteRows = invitations.map((invitation) => ({
            id: `invite:${invitation.id}`,
            name: invitation.nome,
            email: invitation.email,
            phone: invitation.telefone,
            department: invitation.cargo,
            role: roleFromProfile(invitation.perfil),
            status: invitation.expiraEm > now ? "PENDING" : "EXPIRED",
            createdAt: invitation.criadoEm.toISOString(),
            canManage: roleFromProfile(currentUser.perfil) === "ADMIN",
        }));
        response.json({
            users: [...inviteRows, ...userRows],
            permissions: { canManageUsers: roleFromProfile(currentUser.perfil) === "ADMIN" },
            stats: {
                total: users.length,
                active: users.filter((user) => user.ativo).length,
                administrators: users.filter((user) => roleFromProfile(user.perfil) === "ADMIN").length,
                pendingInvitations: invitations.filter((invitation) => invitation.expiraEm > now).length,
            },
        });
    }
    catch (error) {
        console.error("Erro ao listar usuários da organização:", error);
        response.status(500).json({ message: "Não foi possível carregar os usuários." });
    }
});
router.post("/usuarios/convites", auth_middleware_1.autenticar, async (request, response) => {
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({
            message: "Confira as informações do convite.",
            errors: parsed.error.issues.map(({ path, message }) => ({
                field: path.join("."),
                message,
            })),
        });
        return;
    }
    try {
        const currentUser = await loadAdministrator(request.usuario, response);
        if (!currentUser?.participante_id || !currentUser.participante)
            return;
        const existingUser = await prisma_1.prisma.usuario.findUnique({
            where: { email: parsed.data.email },
        });
        if (existingUser) {
            response.status(409).json({ message: "Este e-mail já possui uma conta." });
            return;
        }
        const existingInvite = await prisma_1.prisma.conviteUsuario.findFirst({
            where: {
                participanteId: currentUser.participante_id,
                email: parsed.data.email,
                status: "PENDENTE",
                expiraEm: { gt: new Date() },
            },
        });
        if (existingInvite) {
            response.status(409).json({
                message: "Já existe um convite pendente para este e-mail.",
            });
            return;
        }
        const token = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        const invitation = await prisma_1.prisma.conviteUsuario.create({
            data: {
                participanteId: currentUser.participante_id,
                remetenteId: currentUser.id,
                nome: parsed.data.name,
                email: parsed.data.email,
                telefone: parsed.data.phone || null,
                cargo: parsed.data.department,
                perfil: roleToProfile[parsed.data.role],
                tokenHash: hashInviteToken(token),
                expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:5173")
            .replace(/\/$/, "");
        const inviteLink = `${frontendUrl}/aceitar-convite?token=${encodeURIComponent(token)}`;
        try {
            await (0, email_service_1.enviarConviteUsuario)(invitation.email, invitation.nome, currentUser.participante.nome, inviteLink);
        }
        catch (error) {
            await prisma_1.prisma.conviteUsuario.delete({ where: { id: invitation.id } });
            throw error;
        }
        response.status(201).json({
            message: "Convite enviado por e-mail.",
            invitation: {
                id: `invite:${invitation.id}`,
                name: invitation.nome,
                email: invitation.email,
                phone: invitation.telefone,
                department: invitation.cargo,
                role: parsed.data.role,
                status: "PENDING",
                createdAt: invitation.criadoEm.toISOString(),
            },
        });
    }
    catch (error) {
        console.error("Erro ao enviar convite:", error);
        response.status(502).json({
            message: "Não foi possível enviar o convite. Verifique a configuração de e-mail.",
        });
    }
});
router.delete("/usuarios/convites/:id", auth_middleware_1.autenticar, async (request, response) => {
    const rawId = request.params.id;
    const invitationId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (typeof invitationId !== "string" || !/^\d+$/.test(invitationId)) {
        response.status(400).json({ message: "Convite inválido." });
        return;
    }
    try {
        const currentUser = await loadAdministrator(request.usuario, response);
        if (!currentUser?.participante_id)
            return;
        const invitation = await prisma_1.prisma.conviteUsuario.findFirst({
            where: {
                id: BigInt(invitationId),
                participanteId: currentUser.participante_id,
                status: "PENDENTE",
            },
        });
        if (!invitation) {
            response.status(404).json({
                message: "Convite pendente não encontrado ou já foi processado.",
            });
            return;
        }
        await prisma_1.prisma.conviteUsuario.delete({
            where: { id: invitation.id },
        });
        response.json({ message: "Convite cancelado." });
    }
    catch (error) {
        console.error("Erro ao cancelar convite:", error);
        response.status(500).json({ message: "Não foi possível cancelar o convite." });
    }
});
router.patch("/usuarios/:id", auth_middleware_1.autenticar, async (request, response) => {
    const parsed = updateUserSchema.safeParse(request.body);
    const rawId = request.params.id;
    const userId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!parsed.success || typeof userId !== "string" || !/^\d+$/.test(userId)) {
        response.status(400).json({ message: "Dados do usuário inválidos." });
        return;
    }
    try {
        const currentUser = await loadAdministrator(request.usuario, response);
        if (!currentUser?.participante_id)
            return;
        const targetId = BigInt(userId);
        const target = await prisma_1.prisma.usuario.findFirst({
            where: { id: targetId, participante_id: currentUser.participante_id },
        });
        if (!target) {
            response.status(404).json({ message: "Usuário não encontrado." });
            return;
        }
        const targetIsAdmin = roleFromProfile(target.perfil) === "ADMIN";
        if (targetIsAdmin &&
            target.ativo &&
            parsed.data.role !== "ADMIN" &&
            (await prisma_1.prisma.usuario.count({
                where: {
                    participante_id: currentUser.participante_id,
                    ativo: true,
                    perfil: { in: ["ADMINISTRADOR", "ADMIN"] },
                },
            })) <= 1) {
            response.status(409).json({
                message: "A organização precisa manter pelo menos um administrador ativo.",
            });
            return;
        }
        const updated = await prisma_1.prisma.usuario.update({
            where: { id: target.id },
            data: {
                nome: parsed.data.name,
                telefone: parsed.data.phone || null,
                cargo: parsed.data.department,
                perfil: roleToProfile[parsed.data.role],
            },
        });
        response.json({
            user: {
                id: `user:${updated.id}`,
                name: updated.nome,
                email: updated.email,
                phone: updated.telefone,
                department: updated.cargo ?? "",
                role: parsed.data.role,
                status: updated.ativo ? "ACTIVE" : "INACTIVE",
                createdAt: null,
            },
        });
    }
    catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        response.status(500).json({ message: "Não foi possível atualizar o usuário." });
    }
});
router.patch("/usuarios/:id/status", auth_middleware_1.autenticar, async (request, response) => {
    const rawId = request.params.id;
    const userId = Array.isArray(rawId) ? rawId[0] : rawId;
    const parsed = zod_1.z.object({ active: zod_1.z.boolean() }).safeParse(request.body);
    if (!parsed.success || typeof userId !== "string" || !/^\d+$/.test(userId)) {
        response.status(400).json({ message: "Estado ou usuário inválido." });
        return;
    }
    try {
        const currentUser = await loadAdministrator(request.usuario, response);
        if (!currentUser?.participante_id)
            return;
        const targetId = BigInt(userId);
        if (targetId === currentUser.id && !parsed.data.active) {
            response.status(400).json({ message: "Você não pode desativar sua própria conta." });
            return;
        }
        const target = await prisma_1.prisma.usuario.findFirst({
            where: { id: targetId, participante_id: currentUser.participante_id },
        });
        if (!target) {
            response.status(404).json({ message: "Usuário não encontrado." });
            return;
        }
        if (!parsed.data.active &&
            target.ativo &&
            roleFromProfile(target.perfil) === "ADMIN" &&
            (await prisma_1.prisma.usuario.count({
                where: {
                    participante_id: currentUser.participante_id,
                    ativo: true,
                    perfil: { in: ["ADMINISTRADOR", "ADMIN"] },
                },
            })) <= 1) {
            response.status(409).json({
                message: "A organização precisa manter pelo menos um administrador ativo.",
            });
            return;
        }
        const updated = await prisma_1.prisma.usuario.update({
            where: { id: target.id },
            data: { ativo: parsed.data.active },
        });
        response.json({
            id: `user:${updated.id}`,
            status: updated.ativo ? "ACTIVE" : "INACTIVE",
        });
    }
    catch (error) {
        console.error("Erro ao alterar status do usuário:", error);
        response.status(500).json({ message: "Não foi possível alterar o status." });
    }
});
exports.default = router;
