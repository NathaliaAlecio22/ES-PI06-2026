"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleFromProfile = roleFromProfile;
exports.loadCurrentUser = loadCurrentUser;
const prisma_1 = require("../lib/prisma");
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
