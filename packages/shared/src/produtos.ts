import { z } from "zod";

/**
 * Wire contract of the Postgres-backed `/api/produtos` routes (apps/api/src/routes/produtos.ts).
 * Distinct from the generic chain-demo `/api/workflows`/`/api/batches` routes in api.ts — see
 * docs/consolidation-followup.md, "architecture deviations" #1.
 */

/** `POST /api/produtos` */
export const createProductRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    code: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(100),
    description: z.string().trim().max(5_000).nullable().optional(),
    lot: z.string().trim().min(1).max(100),
    manufacturingDate: z.iso.date(),
    expirationDate: z.iso.date().nullable().optional(),
    quantity: z.coerce.number().finite().positive().max(99_999_999_999.999),
    unit: z.string().trim().min(1).max(30),
    location: z.string().trim().min(1).max(200),
  })
  .refine(
    ({ manufacturingDate, expirationDate }) =>
      !expirationDate || expirationDate >= manufacturingDate,
    {
      path: ["expirationDate"],
      message: "A validade não pode ser anterior à data de fabricação.",
    },
  );

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

/** One product+lot row, as returned by `GET /api/produtos` and `POST /api/produtos`. */
export const productRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  lot: z.string(),
  category: z.string(),
  manufacturingDate: z.string(),
  owner: z.string(),
  location: z.string(),
  status: z.string(),
  quantity: z.string(),
  unit: z.string(),
  expirationDate: z.string(),
  description: z.string(),
  manufacturer: z.string(),
  responsible: z.string(),
});

export type ProductRow = z.infer<typeof productRowSchema>;
