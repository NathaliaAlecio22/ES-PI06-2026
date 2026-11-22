import { z } from "zod";

/**
 * Wire contract of the Postgres-backed `/api/transferencias` routes
 * (apps/api/src/routes/transferencias.ts). Distinct from the generic chain-demo
 * `/api/batches/:batchId/transfers` route in api.ts.
 */

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().finite().optional(),
);

/** `POST /api/transferencias` */
export const createTransferRequestSchema = z.object({
  lot: z.string().trim().min(1).max(100),
  destinationId: z.string().regex(/^\d+$/, "Destino inválido."),
  location: z.string().trim().min(1).max(200),
  temperature: optionalNumber,
  humidity: optionalNumber.refine(
    (value) => value === undefined || (value >= 0 && value <= 100),
    "A umidade deve estar entre 0 e 100%.",
  ),
  notes: z.string().trim().max(2_000).optional(),
});

export type CreateTransferRequest = z.infer<typeof createTransferRequestSchema>;

/** `POST /api/transferencias/:id/ocorrencia` */
export const reportIssueRequestSchema = z.object({
  notes: z.string().trim().min(3).max(2_000),
});

export type ReportIssueRequest = z.infer<typeof reportIssueRequestSchema>;

/** One transfer row, as returned by `GET /api/transferencias` and the mutating endpoints. */
export const transferListItemSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  product: z.string(),
  lot: z.string(),
  previousOwner: z.string(),
  newOwner: z.string(),
  date: z.string(),
  time: z.string(),
  status: z.string(),
  storageStatus: z.string(),
  hash: z.string(),
  location: z.string(),
  quantity: z.string(),
  temperature: z.string().optional(),
  humidity: z.string().optional(),
  notes: z.string().optional(),
  canRespond: z.boolean(),
});

export type TransferListItem = z.infer<typeof transferListItemSchema>;

/** One entry of `GET /api/transferencias/opcoes`'s `lots`. */
export const transferLotOptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  product: z.string(),
  quantity: z.string(),
  unit: z.string(),
  currentOwner: z.string(),
  location: z.string(),
  /** The on-chain role the destination must hold — see `chainRoleForTipo` in org-chain.ts. */
  nextRole: z.string(),
});

export type TransferLotOption = z.infer<typeof transferLotOptionSchema>;

/** One entry of `GET /api/transferencias/opcoes`'s `participants`. */
export const transferParticipantOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().nullable(),
});

export type TransferParticipantOption = z.infer<typeof transferParticipantOptionSchema>;

export const transferStatsSchema = z.object({
  total: z.number().int().min(0),
  pending: z.number().int().min(0),
  confirmed: z.number().int().min(0),
  withIssue: z.number().int().min(0),
});

export type TransferStats = z.infer<typeof transferStatsSchema>;
