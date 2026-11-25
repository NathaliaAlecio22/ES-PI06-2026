import { execSync } from "node:child_process";

import "dotenv/config";

import { E2E_DATABASE_URL } from "./database-url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(3_000),
  });
  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

/**
 * Runs once before the suite: guards against a shared database, brings the local schema
 * up to date and checks the Hardhat node has the factory deployed.
 */
export default async function setup(): Promise<void> {
  const host = new URL(E2E_DATABASE_URL).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `E2E recusado: o banco ${host} não é local. A suíte apaga todas as tabelas a cada execução.`,
    );
  }

  execSync("npx prisma migrate deploy --config prisma7.config.ts", {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "pipe",
  });

  const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const factory = process.env.WORKFLOW_FACTORY_ADDRESS;
  let code: unknown;
  try {
    code = factory ? await rpc(rpcUrl, "eth_getCode", [factory, "latest"]) : undefined;
  } catch {
    throw new Error(`E2E: nó Hardhat indisponível em ${rpcUrl} (contracts/: npm run node).`);
  }
  if (typeof code !== "string" || code === "0x") {
    throw new Error(
      `E2E: WorkflowFactory não implantado em ${factory ?? "(WORKFLOW_FACTORY_ADDRESS vazio)"} ` +
        "(contracts/: npm run deploy:local num nó recém-iniciado).",
    );
  }
}
