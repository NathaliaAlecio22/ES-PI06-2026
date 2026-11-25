/** Local database the e2e suite resets on every run (`npm run e2e:db` starts it). */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:e2e@127.0.0.1:5433/traceblock_e2e";
