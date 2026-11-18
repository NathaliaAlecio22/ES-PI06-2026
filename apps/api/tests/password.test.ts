import { randomBytes, scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/utils/password";

describe("password verification", () => {
  it("verifies hashes using the current format", async () => {
    const password = "SenhaSegura123";
    const hash = await hashPassword(password);

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("verifies hashes created with the legacy dollar-delimited format", async () => {
    const password = "SenhaSegura123";
    const salt = randomBytes(16);
    const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });
});
