import { defineConfig } from "vitest/config";

// Keep in sync with tests/e2e/database-url.ts (not imported: the config loader is ESM-only).
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:e2e@127.0.0.1:5433/traceblock_e2e";

/**
 * End-to-end suite: the real API against a local Postgres and a local Hardhat node.
 * It resets its database on every run, so it must never point at a shared one —
 * tests/e2e/global-setup.ts refuses any non-local DATABASE_URL.
 *
 *   npm run e2e:db      (once: local Postgres in Docker on port 5433)
 *   npm run node        (contracts/: Hardhat node)  +  npm run deploy:local
 *   npm run test:e2e
 */
export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    globalSetup: ["tests/e2e/global-setup.ts"],
    // Overrides .env (dotenv never overwrites a variable that is already set).
    env: { DATABASE_URL: E2E_DATABASE_URL, NODE_ENV: "test" },
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
