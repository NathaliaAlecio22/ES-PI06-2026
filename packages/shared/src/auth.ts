import { z } from "zod";

/**
 * Wire contract of the `/api/auth` routes (apps/api/src/routes/auth.ts).
 */

/** `POST /api/auth/login` */
export const loginRequestSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
  senha: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** `POST /api/auth/forgot-password` */
export const forgotPasswordRequestSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

/** `POST /api/auth/verify-reset-code` */
export const verifyResetCodeRequestSchema = z.object({
  email: z.string().email(),
  codigo: z.string().regex(/^\d{6}$/, "Código inválido."),
});

export type VerifyResetCodeRequest = z.infer<typeof verifyResetCodeRequestSchema>;

/** `POST /api/auth/reset-password` */
export const resetPasswordRequestSchema = z
  .object({
    email: z.string().email(),
    codigo: z.string().regex(/^\d{6}$/),
    senha: z.string().min(8).max(128),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "As senhas não coincidem.",
  });

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

/** The `usuario` fragment returned by `POST /api/auth/login` and `GET /api/auth/me`. */
export const authenticatedUserSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  perfil: z.string(),
  cargo: z.string().nullable(),
  participanteId: z.string(),
  empresa: z.string(),
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

/** Response of `POST /api/auth/login`. */
export const loginResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  usuario: authenticatedUserSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
