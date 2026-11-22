"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const vitest_1 = require("vitest");
const password_1 = require("../src/utils/password");
(0, vitest_1.describe)("password verification", () => {
    (0, vitest_1.it)("verifies hashes using the current format", async () => {
        const password = "SenhaSegura123";
        const hash = await (0, password_1.hashPassword)(password);
        await (0, vitest_1.expect)((0, password_1.verifyPassword)(password, hash)).resolves.toBe(true);
        await (0, vitest_1.expect)((0, password_1.verifyPassword)("senha-incorreta", hash)).resolves.toBe(false);
    });
    (0, vitest_1.it)("verifies hashes created with the legacy dollar-delimited format", async () => {
        const password = "SenhaSegura123";
        const salt = (0, node_crypto_1.randomBytes)(16);
        const hash = `scrypt$${salt.toString("hex")}$${(0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex")}`;
        await (0, vitest_1.expect)((0, password_1.verifyPassword)(password, hash)).resolves.toBe(true);
        await (0, vitest_1.expect)((0, password_1.verifyPassword)("senha-incorreta", hash)).resolves.toBe(false);
    });
});
