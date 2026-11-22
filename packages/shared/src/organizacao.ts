import { z } from "zod";

/**
 * Wire contract of the application-level (non-chain) `/api/organizacao` routes
 * (apps/api/src/routes/organizacao.ts) and the session role vocabulary used throughout the
 * API (apps/api/src/utils/session.ts).
 */

export const USER_ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const userRoleSchema = z.enum(USER_ROLES);

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "EXPIRED"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

/** `POST /api/organizacao/usuarios/convites` */
export const inviteUserRequestSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(150).transform((email) => email.toLowerCase()),
  phone: z.string().trim().max(30).nullable().optional(),
  department: z.string().trim().min(2).max(100),
  role: userRoleSchema,
});

export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>;

/** `PATCH /api/organizacao/usuarios/:id` */
export const updateUserRequestSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).nullable().optional(),
  department: z.string().trim().min(2).max(100),
  role: userRoleSchema,
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

/** `PATCH /api/organizacao/usuarios/:id/status` */
export const updateUserStatusRequestSchema = z.object({ active: z.boolean() });

export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusRequestSchema>;

/** `POST /api/organizacao/convites/aceitar` */
export const acceptInviteRequestSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128),
});

export type AcceptInviteRequest = z.infer<typeof acceptInviteRequestSchema>;

/** One user/invitation row, as returned by `GET /api/organizacao/usuarios` and the mutations. */
export const organizationUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  department: z.string(),
  role: userRoleSchema,
  status: z.enum(USER_STATUSES),
  createdAt: z.string().nullable(),
  canManage: z.boolean().optional(),
});

export type OrganizationUser = z.infer<typeof organizationUserSchema>;
