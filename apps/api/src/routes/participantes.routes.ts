import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";

const participantTypes = [
  "Fabricante",
  "Distribuidor",
  "Transportadora",
  "Centro de armazenamento",
  "Varejista",
] as const;

function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = [...base].reduce(
      (total, digit, index) => total + Number(digit) * weights[index],
      0,
    );
    const remainder = sum % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  };

  const firstDigit = calculateDigit(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateDigit(
    cnpj.slice(0, 12) + firstDigit,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return cnpj.endsWith(firstDigit + secondDigit);
}

const registerSchema = z
  .object({
    nomeCompleto: z.string().trim().min(2).max(150),
    email: z.email().max(150).transform((email) => email.toLowerCase()),
    senha: z.string().min(8).max(128),
    confirmarSenha: z.string(),
    telefone: z
      .string()
      .trim()
      .max(30)
      .transform((telefone) => telefone || null),
    nomeOrganizacao: z.string().trim().min(2).max(150),
    cnpj: z
      .string()
      .refine(isValidCnpj, "Informe um CNPJ válido.")
      .transform((cnpj) => cnpj.replace(/\D/g, "")),
    tipo: z.enum(participantTypes),
    cargo: z.string().trim().min(2).max(100),
    aceitouTermos: z.literal(true),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não conferem.",
  });

export const participantesRouter = Router();

participantesRouter.post("/cadastro", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
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

    res.status(201).json({
        message: "Empresa cadastrada com sucesso! Você já pode acessar o TraceBlock.",
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        message: "Já existe um cadastro com este e-mail ou CNPJ.",
      });
      return;
    }

    console.error("Erro ao cadastrar participante:", error);
    res.status(500).json({ message: "Não foi possível concluir o cadastro." });
  }
});