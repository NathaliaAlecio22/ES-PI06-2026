"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const password_1 = require("../utils/password");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const session_1 = require("../utils/session");
const participantTypes = [
    "Fabricante",
    "Distribuidor",
    "Transportadora",
    "Centro de armazenamento",
    "Varejista",
];
function isValidCnpj(value) {
    if (value.length !== 14 || /^(\d)\1{13}$/.test(value)) {
        return false;
    }
    const calculateDigit = (base, weights) => {
        const sum = [...base].reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
        const remainder = sum % 11;
        return String(remainder < 2 ? 0 : 11 - remainder);
    };
    const firstDigit = calculateDigit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const secondDigit = calculateDigit(value.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return value.endsWith(firstDigit + secondDigit);
}
const registerSchema = zod_1.z
    .object({
    nomeCompleto: zod_1.z.string().trim().min(2).max(150),
    email: zod_1.z.string().trim().email().max(150).transform((email) => email.toLowerCase()),
    senha: zod_1.z.string().min(8).max(128),
    confirmarSenha: zod_1.z.string(),
    telefone: zod_1.z
        .string()
        .trim()
        .max(30)
        .transform((telefone) => telefone || null),
    nomeOrganizacao: zod_1.z.string().trim().min(2).max(150),
    cnpj: zod_1.z
        .string()
        .trim()
        .regex(/^[\d./-]+$/, "Informe um CNPJ válido.")
        .transform((cnpj) => cnpj.replace(/\D/g, ""))
        .refine(isValidCnpj, "Informe um CNPJ válido."),
    tipo: zod_1.z.enum(participantTypes),
    cargo: zod_1.z.string().trim().min(2).max(100),
    aceitouTermos: zod_1.z.literal(true),
})
    .refine((data) => data.senha === data.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não conferem.",
});
exports.participantesRouter = (0, express_1.Router)();
exports.participantesRouter.post("/cadastro", async (request, response) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({
            message: "Confira os dados informados.",
            errors: parsed.error.issues.map(({ path, message }) => ({
                field: path.join("."),
                message,
            })),
        });
        return;
    }
    const { nomeCompleto, email, senha, telefone, nomeOrganizacao, cnpj, tipo, cargo, } = parsed.data;
    try {
        const senhaHash = await (0, password_1.hashPassword)(senha);
        const result = await prisma_1.prisma.$transaction(async (transaction) => {
            const participante = await transaction.participante.create({
                data: {
                    nome: nomeOrganizacao,
                    identificacao: cnpj,
                    email,
                    tipo,
                    ativo: true,
                },
            });
            const usuario = await transaction.usuario.create({
                data: {
                    participante_id: participante.id,
                    nome: nomeCompleto,
                    email,
                    senha_hash: senhaHash,
                    perfil: "ADMINISTRADOR",
                    telefone,
                    cargo,
                },
            });
            return {
                participanteId: participante.id.toString(),
                usuarioId: usuario.id.toString(),
            };
        });
        response.status(201).json({
            message: "Empresa cadastrada com sucesso! Você já pode acessar o TraceBlock.",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            response.status(409).json({
                message: "Já existe um cadastro com este e-mail ou CNPJ.",
            });
            return;
        }
        console.error("Erro ao cadastrar participante:", error);
        response.status(500).json({
            message: "Não foi possível concluir o cadastro.",
        });
    }
});
exports.participantesRouter.get("/destinos", auth_middleware_1.autenticar, async (request, response) => {
    try {
        const user = await (0, session_1.loadCurrentUser)(request.usuario, response);
        if (!user?.participante_id)
            return;
        const participants = await prisma_1.prisma.participante.findMany({
            where: { ativo: true, id: { not: user.participante_id } },
            select: { id: true, nome: true, tipo: true },
            orderBy: { nome: "asc" },
        });
        exports.participantesRouter.get("/cadeia-opcoes", auth_middleware_1.autenticar, async (request, response) => {
            try {
                const user = await (0, session_1.loadCurrentUser)(request.usuario, response);
                if (!user?.participante_id)
                    return;
                const participants = await prisma_1.prisma.participante.findMany({
                    where: { ativo: true, wallet_address: { not: null } },
                    select: { id: true, nome: true, tipo: true, wallet_address: true },
                    orderBy: { nome: "asc" },
                });
                response.json({
                    organizationId: user.participante_id.toString(),
                    participants: participants.map((participant) => ({
                        id: participant.id.toString(),
                        name: participant.nome,
                        type: participant.tipo ?? "",
                        address: participant.wallet_address,
                        role: roleForParticipantType(participant.tipo),
                    })).filter((participant) => participant.role !== null),
                });
            }
            catch (error) {
                console.error("Erro ao listar participantes para a cadeia:", error);
                response.status(500).json({ message: "Não foi possível carregar os participantes da cadeia." });
            }
        });
        function roleForParticipantType(type) {
            const roles = {
                Fabricante: "manufacturer",
                Distribuidor: "distributor",
                Transportadora: "carrier",
                "Centro de armazenamento": "distribution_center",
                Varejista: "retailer",
            };
            return type ? roles[type] ?? null : null;
        }
        response.json({
            participants: participants.map((p) => ({
                id: p.id.toString(),
                name: p.nome,
                type: p.tipo ?? "",
            })),
        });
    }
    catch (error) {
        console.error("Erro ao listar destinos:", error);
        response.status(500).json({ message: "Não foi possível carregar os destinos." });
    }
});
