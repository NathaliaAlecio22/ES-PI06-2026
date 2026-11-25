import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The e2e suite wipes its database; it runs only through `npm run test:e2e`.
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
