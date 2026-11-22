import { Prisma } from "@prisma/client";
import { Router } from "express";

import { registerParticipantRequestSchema } from "@provenance/shared";

import { prisma } from "../lib/prisma";
import { revertReasonOf } from "../blockchain";
import { hashPassword } from "../utils/password";
import {
  allocateAccountForNewOrganization,
  buildWorkflowSteps,
  chainRoleForTipo,
  defaultSubsequentTypes,
  deployWorkflowForOrganization,
} from "../chain/org-chain";
import { NoChainAccountAvailableError } from "../chain/hardhat-accounts";

import { autenticar } from "../middlewares/auth.middleware";
import { loadCurrentUser } from "../utils/session";

export const participantesRouter = Router();

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
    workflowSteps,
  } = parsed.data;

  // Pre-check uniqueness before touching the chain: a P2002 after the workflow
  // deployment would leave an orphaned on-chain contract (chain first, database
  // second — docs/context.md §3.3; the local chain is resettable, but there is
  // no reason to spend the deploy on a request that cannot succeed).
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

  // The organization's own workflow: step 0 is its own role; the admin chose the
  // subsequent steps at signup (or the documented defaults apply).
  const ownRole = chainRoleForTipo(tipo);
  const steps = buildWorkflowSteps({
    organization: nomeOrganizacao,
    ownRole,
    subsequentTypes: workflowSteps.length > 0 ? workflowSteps : defaultSubsequentTypes(),
  });

  let deployed: Awaited<ReturnType<typeof deployWorkflowForOrganization>>;
  try {
    deployed = await deployWorkflowForOrganization({
      organization: nomeOrganizacao,
      ownRole,
      steps,
      adminPrivateKey: account.privateKey,
    });
  } catch (error) {
    const revertReason = revertReasonOf(error);
    const detail = revertReason ?? (error instanceof Error ? error.message : String(error));
    response.status(502).json({
      message:
        "Não foi possível registrar a organização na blockchain. Verifique se o nó local " +
        "está ativo e o WorkflowFactory implantado (contracts/README.md).",
      detail,
    });
    return;
  }

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
          workflow_address: deployed.workflowAddress,
          workflow_steps: deployed.steps,
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
        workflowAddress: deployed.workflowAddress,
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

    // The workflow stays deployed on the (resettable local) chain while the database
    // write failed — accepted PoC trade-off; the account slot stays unused until the
    // local chain resets, because nothing references it in the database.
    console.error("Erro ao cadastrar participante:", error);
    response.status(500).json({
      message: "Não foi possível concluir o cadastro.",
    });
  }
});

participantesRouter.get("/destinos", autenticar, async (request, response) => {
  try {
    const user = await loadCurrentUser(request.usuario, response);
    if (!user?.participante_id) return;

    const participants = await prisma.participante.findMany({
      where: { ativo: true, id: { not: user.participante_id } },
      select: { id: true, nome: true, tipo: true },
      orderBy: { nome: "asc" },
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
