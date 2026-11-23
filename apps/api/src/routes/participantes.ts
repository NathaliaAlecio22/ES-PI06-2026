import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import {
  isValidCnpj,
  participantTypeSchema,
  registerParticipantRequestSchema,
} from "@provenance/shared";

import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { hashPassword } from "../utils/password";
import { allocateAccountForNewOrganization } from "../chain/org-chain";
import { NoChainAccountAvailableError } from "../chain/hardhat-accounts";
import { enviarConviteUsuario } from "../service/email.service";

import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser, roleFromProfile } from "../utils/session";

export const participantesRouter = Router();

const createParticipantInviteSchema = z.object({
  name: z.string().trim().min(2).max(150),
  cnpj: z.string()
    .trim()
    .regex(/^[\d./-]+$/, "Informe um CNPJ válido.")
    .transform((cnpj) => cnpj.replace(/\D/g, ""))
    .refine(isValidCnpj, "Informe um CNPJ válido."),
  type: participantTypeSchema,
  person: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(150).transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(30).transform((phone) => phone || null),
});

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

participantesRouter.get("/", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user) return;

    const now = new Date();
    const organizations = await prisma.participante.findMany({
      orderBy: { nome: "asc" },
      include: {
        usuario: {
          where: { ativo: true },
          orderBy: { id: "asc" },
          take: 1,
          select: { nome: true, email: true, telefone: true },
        },
        convites: {
          where: { status: "PENDENTE", expiraEm: { gt: now } },
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: { nome: true, email: true, telefone: true },
        },
        produtos_fabricados: {
          select: { _count: { select: { lote: true } } },
        },
      },
    });

    const participants = organizations.map((organization) => {
      const activeUser = organization.usuario[0];
      const pendingInvite = organization.convites[0];
      const lots = organization.produtos_fabricados.reduce(
        (total, product) => total + product._count.lote,
        0,
      );
      const status = !organization.ativo
        ? "INACTIVE"
        : activeUser
          ? "ACTIVE"
          : pendingInvite
            ? "PENDING"
            : "INACTIVE";

      return {
        id: organization.id.toString(),
        name: organization.nome,
        cnpj: organization.identificacao ?? "",
        type: organization.tipo ?? "Não informado",
        person: activeUser?.nome ?? pendingInvite?.nome ?? "Não informado",
        email: activeUser?.email ?? pendingInvite?.email ?? organization.email ?? "",
        phone: activeUser?.telefone ?? pendingInvite?.telefone ?? "",
        lots,
        status,
      };
    });

    response.json({
      participants,
      stats: {
        total: participants.length,
        active: participants.filter((participant) => participant.status === "ACTIVE").length,
        pendingInvitations: participants.filter((participant) => participant.status === "PENDING").length,
        lots: participants.reduce((total, participant) => total + participant.lots, 0),
      },
      permissions: {
        canManageParticipants: roleFromProfile(user.perfil) === "ADMIN",
      },
    });
  } catch (error) {
    console.error("Erro ao listar organizações participantes:", error);
    response.status(500).json({ message: "Não foi possível carregar as organizações participantes." });
  }
});

participantesRouter.post("/", autenticar, async (request, response) => {
  const parsed = createParticipantInviteSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Confira os dados da organização e do responsável.",
    });
    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user) return;
    if (roleFromProfile(user.perfil) !== "ADMIN") {
      response.status(403).json({ message: "Somente administradores podem cadastrar organizações participantes." });
      return;
    }

    const duplicateCnpj = await prisma.participante.findUnique({
      where: { identificacao: parsed.data.cnpj },
      select: { id: true },
    });
    if (duplicateCnpj) {
      response.status(409).json({ message: "Já existe uma organização cadastrada com este CNPJ." });
      return;
    }

    const now = new Date();
    const [existingUser, pendingInvitation] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: parsed.data.email }, select: { id: true } }),
      prisma.conviteUsuario.findFirst({
        where: {
          email: parsed.data.email,
          status: "PENDENTE",
          expiraEm: { gt: now },
        },
        select: { id: true },
      }),
    ]);
    if (existingUser || pendingInvitation) {
      response.status(409).json({ message: "Este e-mail já possui uma conta ou um convite pendente." });
      return;
    }

    let account: Awaited<ReturnType<typeof allocateAccountForNewOrganization>>;
    try {
      account = await allocateAccountForNewOrganization();
    } catch (error) {
      if (error instanceof NoChainAccountAvailableError) {
        response.status(503).json({ message: error.message });
        return;
      }
      throw error;
    }

    const token = randomBytes(32).toString("base64url");
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const participant = await prisma.$transaction(async (transaction) => {
      const createdParticipant = await transaction.participante.create({
        data: {
          nome: parsed.data.name,
          identificacao: parsed.data.cnpj,
          email: parsed.data.email,
          tipo: parsed.data.type,
          ativo: true,
          wallet_address: account.address,
        },
      });

      await transaction.conviteUsuario.create({
        data: {
          participanteId: createdParticipant.id,
          remetenteId: user.id,
          nome: parsed.data.person,
          email: parsed.data.email,
          telefone: parsed.data.phone,
          cargo: "Administrador da organização",
          perfil: "ADMINISTRADOR",
          tokenHash: hashInviteToken(token),
          expiraEm: invitationExpiry,
        },
      });

      return createdParticipant;
    });

    const inviteLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/aceitar-convite?token=${encodeURIComponent(token)}`;
    try {
      await enviarConviteUsuario(
        parsed.data.email,
        parsed.data.person,
        participant.nome,
        inviteLink,
      );
    } catch (error) {
      console.error("Falha ao enviar convite para a organização participante:", error);
      try {
        await prisma.participante.delete({ where: { id: participant.id } });
      } catch (cleanupError) {
        console.error("Falha ao remover organização sem convite enviado:", cleanupError);
      }
      response.status(502).json({
        message: "A organização não foi cadastrada porque o e-mail de convite não pôde ser enviado.",
      });
      return;
    }

    response.status(201).json({
      message: "Organização cadastrada. O responsável receberá um convite para criar a senha.",
      participant: {
        id: participant.id.toString(),
        name: participant.nome,
        cnpj: participant.identificacao ?? "",
        type: participant.tipo ?? "Não informado",
        person: parsed.data.person,
        email: parsed.data.email,
        phone: parsed.data.phone ?? "",
        lots: 0,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ message: "Já existe uma organização com esse CNPJ ou um usuário com esse e-mail." });
      return;
    }
    console.error("Erro ao cadastrar organização participante:", error);
    response.status(500).json({ message: "Não foi possível cadastrar a organização participante." });
  }
});

participantesRouter.post("/cadastro", async (request, response) => {
  const parsed = registerParticipantRequestSchema.safeParse(request.body);

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

  const {
    nomeCompleto,
    email,
    senha,
    telefone,
    nomeOrganizacao,
    cnpj,
    tipo,
    cargo,
  } = parsed.data;

  // Pre-check uniqueness before allocating a chain account.
  const existing = await prisma.participante.findFirst({
    where: { OR: [{ email }, { identificacao: cnpj }] },
    select: { id: true },
  });
  if (existing) {
    response.status(409).json({
      message: "Já existe um cadastro com este e-mail ou CNPJ.",
    });
    return;
  }
  const existingUsuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existingUsuario) {
    response.status(409).json({
      message: "Já existe um cadastro com este e-mail.",
    });
    return;
  }

  // On-chain identity: one of the 10 standard Hardhat accounts (see
  // src/chain/hardhat-accounts.ts — PoC-only, local-network-only).
  let account: Awaited<ReturnType<typeof allocateAccountForNewOrganization>>;
  try {
    account = await allocateAccountForNewOrganization();
  } catch (error) {
    if (error instanceof NoChainAccountAvailableError) {
      response.status(503).json({ message: error.message });
      return;
    }
    throw error;
  }

  // No workflow is deployed at signup: the organization's single custody chain is
  // created later, from the "Cadeia de custódia" tab (docs/TOFIX.md).
  try {
    const senhaHash = await hashPassword(senha);
    const result = await prisma.$transaction(async (transaction) => {
      const participante = await transaction.participante.create({
        data: {
          nome: nomeOrganizacao,
          identificacao: cnpj,
          email,
          tipo,
          ativo: true,
          wallet_address: account.address,
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
      data: {
        ...result,
        walletAddress: account.address,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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

function roleForParticipantType(type: string | null): string | null {
  const roles: Record<string, string> = {
    Fabricante: "manufacturer",
    Distribuidor: "distributor",
    Transportadora: "carrier",
    "Centro de armazenamento": "distribution_center",
    Varejista: "retailer",
  };
  return type ? roles[type] ?? null : null;
}

participantesRouter.get("/destinos", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participants = await prisma.participante.findMany({
      where: { ativo: true, id: { not: user.participante_id } },
      select: { id: true, nome: true, tipo: true },
      orderBy: { nome: "asc" },
    });

    response.json({
      participants: participants.map((p) => ({
        id: p.id.toString(),
        name: p.nome,
        type: p.tipo ?? "",
      })),
    });
  } catch (error) {
    console.error("Erro ao listar destinos:", error);
    response.status(500).json({ message: "Não foi possível carregar os destinos." });
  }
});

participantesRouter.get("/cadeia-opcoes", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participants = await prisma.participante.findMany({
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
  } catch (error) {
    console.error("Erro ao listar participantes para a cadeia:", error);
    response.status(500).json({ message: "Não foi possível carregar os participantes da cadeia." });
  }
});
