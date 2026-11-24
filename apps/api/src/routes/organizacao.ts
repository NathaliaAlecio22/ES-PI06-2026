import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ethers } from "ethers";
import { Router, type Response } from "express";
import { z } from "zod";

import {
  assignableRoleSchema,
  acceptInviteRequestSchema,
  createCustodyChainRequestSchema,
  inviteUserRequestSchema,
  type Role,
  type WorkflowStep,
  updateUserRequestSchema,
  updateUserStatusRequestSchema,
} from "@provenance/shared";

import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { createWorkflow } from "../blockchain";
import {
  chainRoleForTipo,
  ensureParticipantRegistered,
  orgSignerKey,
} from "../chain/org-chain";
import { autenticar } from "../middlewares/auth.middleware";
import { enviarConviteUsuario } from "../service/email.service";
import { hashPassword } from "../utils/password.js";
import type { JwtPayload } from "../utils/jwt";
import { loadCurrentUser, roleFromProfile } from "../utils/session";

const roleToProfile = {
  ADMIN: "ADMINISTRADOR",
  OPERATOR: "OPERADOR",
  VIEWER: "VISUALIZADOR",
} as const;

const walletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Informe um endereço de carteira válido."),
});

type CustodyWorkflowRecord = {
  id: bigint;
  organizacao_id: bigint;
  nome: string;
  endereco_admin: string;
  endereco_contrato: string;
  data_criacao: Date;
  etapas: Array<{
    nome: string;
    papel: string;
    endereco_carteira: string;
    hash_especificacao: string;
    ordem: number;
  }>;
};

function toWorkflowDefinition(chain: CustodyWorkflowRecord) {
  const steps = chain.etapas.map((step) => ({
    name: step.nome,
    requiredRole: assignableRoleSchema.parse(step.papel),
    assignee: step.endereco_carteira,
    specificationHash: step.hash_especificacao,
  }));
  const participantsByAddress = new Map<string, { address: string; role: Role }>();
  for (const step of steps) {
    participantsByAddress.set(step.assignee.toLowerCase(), {
      address: step.assignee,
      role: step.requiredRole,
    });
  }

  return {
    id: chain.id.toString(),
    organizationId: chain.organizacao_id.toString(),
    name: chain.nome,
    adminAddress: chain.endereco_admin,
    workflowAddress: chain.endereco_contrato,
    steps,
    participants: [...participantsByAddress.values()],
    createdAt: chain.data_criacao.toISOString(),
  };
}

const router = Router();

router.get("/workflow", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const [chain, organizations] = await Promise.all([
      prisma.cadeia_custodia.findUnique({
        where: { organizacao_id: user.participante_id },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      }),
      prisma.participante.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, tipo: true, wallet_address: true },
        orderBy: { nome: "asc" },
      }),
    ]);

    const participants = organizations.flatMap((organization) => {
      if (!organization.tipo) return [];
      try {
        const role = chainRoleForTipo(organization.tipo);
        if (role === "admin" || role === "none") return [];
        return [{
          id: organization.id.toString(),
          name: organization.nome,
          address: organization.wallet_address,
          role,
        }];
      } catch {
        return [];
      }
    });

    response.json({
      organizationId: user.participante_id.toString(),
      workflow: chain ? toWorkflowDefinition(chain) : null,
      participants,
    });
  } catch (error) {
    console.error("Erro ao carregar configuração da cadeia de custódia:", error);
    response.status(500).json({ message: "Não foi possível carregar a configuração da cadeia." });
  }
});

router.post("/workflow", autenticar, async (request, response) => {
  const parsed = createCustodyChainRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Confira os dados das etapas da cadeia.",
    });
    return;
  }

  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id || !user.participante) return;
    if (roleFromProfile(user.perfil) !== "ADMIN") {
      response.status(403).json({
        message: "Somente um administrador pode definir a cadeia de custódia.",
      });
      return;
    }

    const existing = await prisma.cadeia_custodia.findUnique({
      where: { organizacao_id: user.participante_id },
      select: { id: true },
    });
    if (existing) {
      response.status(409).json({ message: "A cadeia de custódia desta organização já foi configurada." });
      return;
    }

    const organizationWallet = user.participante.wallet_address;
    if (!organizationWallet) {
      response.status(409).json({
        message: "A organização precisa ter uma carteira configurada antes de criar a cadeia.",
      });
      return;
    }

    const organizations = await prisma.participante.findMany({
      where: { ativo: true, wallet_address: { not: null } },
      select: { id: true, nome: true, tipo: true, wallet_address: true },
    });
    const organizationsByAddress = new Map<string, {
      id: bigint;
      name: string;
      address: string;
      role: Role;
    }>();
    for (const organization of organizations) {
      if (!organization.tipo || !organization.wallet_address) continue;
      try {
        const role = chainRoleForTipo(organization.tipo);
        if (role !== "admin" && role !== "none") {
          organizationsByAddress.set(organization.wallet_address.toLowerCase(), {
            id: organization.id,
            name: organization.nome,
            address: organization.wallet_address,
            role,
          });
        }
      } catch {
        continue;
      }
    }

    const stepsWithAssignees = parsed.data.steps.map((step) => {
      const assignee = organizationsByAddress.get(step.assignee.toLowerCase());
      if (!assignee || assignee.role !== step.requiredRole) {
        throw new Error(`A carteira atribuída à etapa "${step.name}" não pertence a um participante ativo com o papel exigido.`);
      }
      return { ...step, assigneeOrganization: assignee };
    });

    // The organization is the workflow's admin/owner and takes part in the chain only if it
    // is assigned to a step like any other participant. Each step has its own participant.
    const assignedAddresses = new Set(stepsWithAssignees.map((step) => step.assignee.toLowerCase()));
    if (assignedAddresses.size !== stepsWithAssignees.length) {
      response.status(409).json({ message: "Cada etapa deve ter um participante diferente." });
      return;
    }

    const workflowSteps: WorkflowStep[] = stepsWithAssignees.map((step) => ({
      name: step.name,
      requiredRole: step.requiredRole,
      specificationHash: ethers.keccak256(ethers.toUtf8Bytes(step.specification)),
    }));
    const signerKey = orgSignerKey(organizationWallet);
    const deployed = await createWorkflow(workflowSteps, signerKey);

    for (const step of stepsWithAssignees) {
      await ensureParticipantRegistered({
        workflowAddress: deployed.workflowAddress,
        participant: step.assigneeOrganization.address,
        role: step.requiredRole,
        adminPrivateKey: signerKey,
      });
    }

    const workflowStepsJson: Prisma.InputJsonValue = workflowSteps.map((step) => ({
      name: step.name,
      requiredRole: step.requiredRole,
      specificationHash: step.specificationHash,
    }));
    const createdChain = await prisma.$transaction(async (transaction) => {
      const chain = await transaction.cadeia_custodia.create({
        data: {
          organizacao_id: user.participante_id!,
          nome: parsed.data.name,
          endereco_admin: organizationWallet,
          endereco_contrato: deployed.workflowAddress,
        },
      });

      await transaction.etapa_cadeia_custodia.createMany({
        data: stepsWithAssignees.map((step, index) => ({
          cadeia_id: chain.id,
          ordem: index,
          nome: step.name,
          papel: step.requiredRole,
          responsavel_id: step.assigneeOrganization.id,
          endereco_carteira: step.assigneeOrganization.address,
          especificacao: step.specification,
          hash_especificacao: workflowSteps[index].specificationHash,
        })),
      });

      await transaction.participante.update({
        where: { id: user.participante_id! },
        data: {
          workflow_address: deployed.workflowAddress,
          workflow_steps: workflowStepsJson,
        },
      });

      return transaction.cadeia_custodia.findUniqueOrThrow({
        where: { id: chain.id },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      });
    });

    response.status(201).json(toWorkflowDefinition(createdChain));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A carteira atribuída à etapa")) {
      response.status(409).json({ message: error.message });
      return;
    }
    console.error("Erro ao criar a cadeia de custódia:", error);
    response.status(502).json({
      message: error instanceof Error
        ? `Não foi possível criar a cadeia de custódia: ${error.message}`
        : "Não foi possível criar a cadeia de custódia.",
    });
  }
});

router.get("/carteira", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id || !user.participante) return;
    response.json({
      name: user.participante.nome,
      address: user.participante.wallet_address,
    });
  } catch (error) {
    console.error("Erro ao carregar a carteira da organização:", error);
    response.status(500).json({ message: "Não foi possível carregar a carteira da organização." });
  }
});

router.patch("/carteira", autenticar, async (request, response) => {
  const parsed = walletSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Carteira inválida." });
    return;
  }
  try {
    const user = await loadAdministrator(request.usuario, response);
    if (!user?.participante_id) return;
    const participant = await prisma.participante.update({
      where: { id: user.participante_id },
      data: { wallet_address: parsed.data.address },
      select: { nome: true, wallet_address: true },
    });
    response.json({ name: participant.nome, address: participant.wallet_address });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ message: "Esta carteira já está vinculada a outro participante." });
      return;
    }
    console.error("Erro ao atualizar carteira da organização:", error);
    response.status(500).json({ message: "Não foi possível atualizar a carteira da organização." });
  }
});

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function loadAdministrator(
  payload: JwtPayload | undefined,
  response: Response,
) {
  const user = await loadCurrentUser(payload, response);
  if (!user) return null;

  if (roleFromProfile(user.perfil) !== "ADMIN") {
    response.status(403).json({
      message: "Somente administradores podem gerenciar usuários.",
    });
    return null;
  }

  return user;
}

router.post("/convites/aceitar", async (request, response) => {
  const parsed = acceptInviteRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Informe um convite e senha válidos." });
    return;
  }

  const now = new Date();
  const tokenHash = hashInviteToken(parsed.data.token);

  try {
    const invitation = await prisma.conviteUsuario.findFirst({
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

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction(async (transaction) => {
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
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") {
      response.status(400).json({ message: "Este convite já foi utilizado ou expirou." });
      return;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      response.status(409).json({
        message: "Este e-mail já possui uma conta. Entre em contato com o administrador.",
      });
      return;
    }

    console.error("Erro ao aceitar convite:", error);
    response.status(500).json({ message: "Não foi possível aceitar o convite." });
  }
});

router.get("/usuarios", autenticar, async (request, response) => {
  try {
    const currentUser = await loadCurrentUser(request.usuario, response);
    if (!currentUser?.participante_id) return;

    const [organization, users, invitations, recentInvitations] = await Promise.all([
      prisma.participante.findUnique({
        where: { id: currentUser.participante_id },
        select: { nome: true, tipo: true },
      }),
      prisma.usuario.findMany({
        where: { participante_id: currentUser.participante_id },
        orderBy: { id: "desc" },
      }),
      prisma.conviteUsuario.findMany({
        where: {
          participanteId: currentUser.participante_id,
          status: "PENDENTE",
        },
        orderBy: { criadoEm: "desc" },
      }),
      prisma.conviteUsuario.findMany({
        where: { participanteId: currentUser.participante_id },
        orderBy: { criadoEm: "desc" },
        take: 10,
      }),
    ]);

    if (!organization) {
      response.status(404).json({ message: "Organização não encontrada." });
      return;
    }

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
      organization: {
        name: organization.nome,
        type: organization.tipo,
      },
      users: [...inviteRows, ...userRows],
      activities: recentInvitations
        .flatMap((invitation) => {
          const events = [{
            id: `invite:${invitation.id}:sent`,
            user: invitation.nome,
            action: "Convite enviado",
            description: `Convite de acesso enviado para ${invitation.email}.`,
            occurredAt: invitation.criadoEm.toISOString(),
          }];

          if (invitation.aceitoEm) {
            events.push({
              id: `invite:${invitation.id}:accepted`,
              user: invitation.nome,
              action: "Convite aceito",
              description: `${invitation.nome} criou a senha e ativou o acesso.`,
              occurredAt: invitation.aceitoEm.toISOString(),
            });
          }

          return events;
        })
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, 10),
      permissions: { canManageUsers: roleFromProfile(currentUser.perfil) === "ADMIN" },
      stats: {
        total: users.length,
        active: users.filter((user) => user.ativo).length,
        administrators: users.filter(
          (user) => roleFromProfile(user.perfil) === "ADMIN",
        ).length,
        pendingInvitations: invitations.filter(
          (invitation) => invitation.expiraEm > now,
        ).length,
      },
    });
  } catch (error) {
    console.error("Erro ao listar usuários da organização:", error);
    response.status(500).json({ message: "Não foi possível carregar os usuários." });
  }
});

router.post("/usuarios/convites", autenticar, async (request, response) => {
  const parsed = inviteUserRequestSchema.safeParse(request.body);
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
    if (!currentUser?.participante_id || !currentUser.participante) return;

    const existingUser = await prisma.usuario.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingUser) {
      response.status(409).json({ message: "Este e-mail já possui uma conta." });
      return;
    }

    const existingInvite = await prisma.conviteUsuario.findFirst({
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

    const token = randomBytes(32).toString("base64url");
    const invitation = await prisma.conviteUsuario.create({
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

    const inviteLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/aceitar-convite?token=${encodeURIComponent(token)}`;

    try {
      await enviarConviteUsuario(
        invitation.email,
        invitation.nome,
        currentUser.participante.nome,
        inviteLink,
      );
    } catch (error) {
      await prisma.conviteUsuario.delete({ where: { id: invitation.id } });
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
  } catch (error) {
    console.error("Erro ao enviar convite:", error);
    response.status(502).json({
      message: "Não foi possível enviar o convite. Verifique a configuração de e-mail.",
    });
  }
});

router.delete("/usuarios/convites/:id", autenticar, async (request, response) => {
  const rawId = request.params.id;
  const invitationId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (typeof invitationId !== "string" || !/^\d+$/.test(invitationId)) {
    response.status(400).json({ message: "Convite inválido." });
    return;
  }

  try {
    const currentUser = await loadAdministrator(request.usuario, response);
    if (!currentUser?.participante_id) return;

    const invitation = await prisma.conviteUsuario.findFirst({
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

    await prisma.conviteUsuario.delete({
      where: { id: invitation.id },
    });

    response.json({ message: "Convite cancelado." });
  } catch (error) {
    console.error("Erro ao cancelar convite:", error);
    response.status(500).json({ message: "Não foi possível cancelar o convite." });
  }
});

router.patch("/usuarios/:id", autenticar, async (request, response) => {
  const parsed = updateUserRequestSchema.safeParse(request.body);
  const rawId = request.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!parsed.success || typeof userId !== "string" || !/^\d+$/.test(userId)) {
    response.status(400).json({ message: "Dados do usuário inválidos." });
    return;
  }

  try {
    const currentUser = await loadAdministrator(request.usuario, response);
    if (!currentUser?.participante_id) return;

    const targetId = BigInt(userId);
    const target = await prisma.usuario.findFirst({
      where: { id: targetId, participante_id: currentUser.participante_id },
    });
    if (!target) {
      response.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    const targetIsAdmin = roleFromProfile(target.perfil) === "ADMIN";
    if (
      targetIsAdmin &&
      target.ativo &&
      parsed.data.role !== "ADMIN" &&
      (await prisma.usuario.count({
        where: {
          participante_id: currentUser.participante_id,
          ativo: true,
          perfil: { in: ["ADMINISTRADOR", "ADMIN"] },
        },
      })) <= 1
    ) {
      response.status(409).json({
        message: "A organização precisa manter pelo menos um administrador ativo.",
      });
      return;
    }

    const updated = await prisma.usuario.update({
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
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    response.status(500).json({ message: "Não foi possível atualizar o usuário." });
  }
});

router.patch("/usuarios/:id/status", autenticar, async (request, response) => {
  const rawId = request.params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = updateUserStatusRequestSchema.safeParse(request.body);
  if (!parsed.success || typeof userId !== "string" || !/^\d+$/.test(userId)) {
    response.status(400).json({ message: "Estado ou usuário inválido." });
    return;
  }

  try {
    const currentUser = await loadAdministrator(request.usuario, response);
    if (!currentUser?.participante_id) return;

    const targetId = BigInt(userId);
    if (targetId === currentUser.id && !parsed.data.active) {
      response.status(400).json({ message: "Você não pode desativar sua própria conta." });
      return;
    }

    const target = await prisma.usuario.findFirst({
      where: { id: targetId, participante_id: currentUser.participante_id },
    });
    if (!target) {
      response.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    if (
      !parsed.data.active &&
      target.ativo &&
      roleFromProfile(target.perfil) === "ADMIN" &&
      (await prisma.usuario.count({
        where: {
          participante_id: currentUser.participante_id,
          ativo: true,
          perfil: { in: ["ADMINISTRADOR", "ADMIN"] },
        },
      })) <= 1
    ) {
      response.status(409).json({
        message: "A organização precisa manter pelo menos um administrador ativo.",
      });
      return;
    }

    const updated = await prisma.usuario.update({
      where: { id: target.id },
      data: { ativo: parsed.data.active },
    });

    response.json({
      id: `user:${updated.id}`,
      status: updated.ativo ? "ACTIVE" : "INACTIVE",
    });
  } catch (error) {
    console.error("Erro ao alterar status do usuário:", error);
    response.status(500).json({ message: "Não foi possível alterar o status." });
  }
});

export default router;
