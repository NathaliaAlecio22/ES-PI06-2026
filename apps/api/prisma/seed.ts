/**
 * Development seed: wipes every application table and recreates a known set of
 * organizations, each with one active admin login and its own Hardhat pool account.
 *
 * It replaces the e-mail invitation flow for local work and for the e2e suite: every
 * organization is ready to log in right away (password `SEED_PASSWORD`).
 *
 * Nothing is written on-chain. The custody chain, products and transfers are created
 * through the API against a running Hardhat node, so database and chain stay in sync.
 *
 *   npm run db:seed          (from apps/api; uses DATABASE_URL)
 */
import type { PrismaClient } from "@prisma/client";

import { hardhatAccounts } from "../src/chain/hardhat-accounts";
import { hashPassword } from "../src/utils/password";

export const SEED_PASSWORD = "Traceblock@2026";

export type SeedOrganizationKey =
  | "admin"
  | "fabricante"
  | "transportadora"
  | "distribuidor"
  | "armazenamento"
  | "varejista"
  | "distribuidorReserva";

type SeedOrganization = {
  key: SeedOrganizationKey;
  name: string;
  cnpjBase: string;
  type: "Fabricante" | "Distribuidor" | "Transportadora" | "Centro de armazenamento" | "Varejista";
  person: string;
  email: string;
};

/**
 * `admin` owns the custody chain (it registers products) but holds no step. One
 * organization per participant type follows, enough for a full 5-step chain, plus a
 * second distributor that is never assigned a step (to check that a role match alone
 * does not authorize a transfer).
 */
export const SEED_ORGANIZATIONS: readonly SeedOrganization[] = [
  { key: "admin", name: "TraceBlock Administradora", cnpjBase: "100000000001", type: "Fabricante", person: "Ana Administradora", email: "admin@traceblock.test" },
  { key: "fabricante", name: "Fabricante Alfa", cnpjBase: "100000000002", type: "Fabricante", person: "Bruno Fabricante", email: "fabricante@traceblock.test" },
  { key: "transportadora", name: "Transportadora Beta", cnpjBase: "100000000003", type: "Transportadora", person: "Carla Transportadora", email: "transportadora@traceblock.test" },
  { key: "distribuidor", name: "Distribuidora Gama", cnpjBase: "100000000004", type: "Distribuidor", person: "Diego Distribuidor", email: "distribuidor@traceblock.test" },
  { key: "armazenamento", name: "Armazém Delta", cnpjBase: "100000000005", type: "Centro de armazenamento", person: "Elisa Armazém", email: "armazem@traceblock.test" },
  { key: "varejista", name: "Varejo Épsilon", cnpjBase: "100000000006", type: "Varejista", person: "Fábio Varejista", email: "varejista@traceblock.test" },
  { key: "distribuidorReserva", name: "Distribuidora Zeta", cnpjBase: "100000000007", type: "Distribuidor", person: "Gabriela Distribuidora", email: "distribuidor2@traceblock.test" },
];

export type SeededOrganization = {
  key: SeedOrganizationKey;
  id: bigint;
  userId: bigint;
  name: string;
  type: SeedOrganization["type"];
  email: string;
  wallet: string;
};

/** Appends the two CNPJ check digits to a 12-digit base. */
function cnpjWithCheckDigits(base: string): string {
  const digit = (value: string, weights: number[]) => {
    const remainder = [...value].reduce((sum, d, i) => sum + Number(d) * weights[i], 0) % 11;
    return String(remainder < 2 ? 0 : 11 - remainder);
  };
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base + first + digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}

/** Empties every application table (keeps Prisma's migration history) and resets ids. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Creates the seed organizations and their admin users. Expects an empty database. */
export async function seedDatabase(prisma: PrismaClient): Promise<Record<SeedOrganizationKey, SeededOrganization>> {
  const accounts = hardhatAccounts();
  if (SEED_ORGANIZATIONS.length > accounts.length) {
    throw new Error("Mais organizações no seed do que contas Hardhat disponíveis.");
  }

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const seeded = {} as Record<SeedOrganizationKey, SeededOrganization>;

  // Accounts are handed out in pool order, exactly as signup would (first free).
  for (const [index, organization] of SEED_ORGANIZATIONS.entries()) {
    const wallet = accounts[index].address;
    const participant = await prisma.participante.create({
      data: {
        nome: organization.name,
        identificacao: cnpjWithCheckDigits(organization.cnpjBase),
        email: organization.email,
        tipo: organization.type,
        ativo: true,
        wallet_address: wallet,
      },
    });
    const user = await prisma.usuario.create({
      data: {
        participante_id: participant.id,
        nome: organization.person,
        email: organization.email,
        senha_hash: passwordHash,
        perfil: "ADMINISTRADOR",
        cargo: "Administrador da organização",
      },
    });
    seeded[organization.key] = {
      key: organization.key,
      id: participant.id,
      userId: user.id,
      name: organization.name,
      type: organization.type,
      email: organization.email,
      wallet,
    };
  }

  return seeded;
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  try {
    await resetDatabase(prisma);
    const seeded = await seedDatabase(prisma);
    console.log(`Seed aplicado. Senha de todos os usuários: ${SEED_PASSWORD}`);
    console.table(
      Object.values(seeded).map(({ name, type, email, wallet }) => ({ name, type, email, wallet })),
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Run only when executed directly (the e2e suite imports the functions above).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
