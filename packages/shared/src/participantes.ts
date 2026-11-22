import { z } from "zod";

/**
 * Wire contract of `/api/participantes` (apps/api/src/routes/participantes.ts). The
 * participant-type vocabulary here is also the custody-chain vocabulary used at signup
 * (apps/api/src/chain/org-chain.ts maps each type to an on-chain `Role`).
 */

export const PARTICIPANT_TYPES = [
  "Fabricante",
  "Distribuidor",
  "Transportadora",
  "Centro de armazenamento",
  "Varejista",
] as const;

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

export const participantTypeSchema = z.enum(PARTICIPANT_TYPES);

/** Luhn-like mod-11 check digit validation for a 14-digit CNPJ (digits only). */
export function isValidCnpj(value: string): boolean {
  if (value.length !== 14 || /^(\d)\1{13}$/.test(value)) {
    return false;
  }

  const calculateDigit = (base: string, weights: number[]): string => {
    const sum = [...base].reduce(
      (total, digit, index) => total + Number(digit) * weights[index],
      0,
    );
    const remainder = sum % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  };

  const firstDigit = calculateDigit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(
    value.slice(0, 12) + firstDigit,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return value.endsWith(firstDigit + secondDigit);
}

/** `POST /api/participantes/cadastro` */
export const registerParticipantRequestSchema = z
  .object({
    nomeCompleto: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(150).transform((email) => email.toLowerCase()),
    senha: z.string().min(8).max(128),
    confirmarSenha: z.string(),
    telefone: z.string().trim().max(30).transform((telefone) => telefone || null),
    nomeOrganizacao: z.string().trim().min(2).max(150),
    cnpj: z
      .string()
      .trim()
      .regex(/^[\d./-]+$/, "Informe um CNPJ válido.")
      .transform((cnpj) => cnpj.replace(/\D/g, ""))
      .refine(isValidCnpj, "Informe um CNPJ válido."),
    tipo: participantTypeSchema,
    cargo: z.string().trim().min(2).max(100),
    aceitouTermos: z.literal(true),
    /**
     * Ordered participant types for the custody steps AFTER the organization's own (step 0
     * is always the organization itself, holding its own role). Optional: skipped steps
     * fall back to the documented default chain (Distribuidor → Transportadora → Varejista).
     */
    workflowSteps: z.array(participantTypeSchema).max(3).default([]),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não conferem.",
  });

export type RegisterParticipantRequest = z.infer<typeof registerParticipantRequestSchema>;

/** One entry of `GET /api/participantes/destinos`. */
export const participantDestinationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

export type ParticipantDestination = z.infer<typeof participantDestinationSchema>;
