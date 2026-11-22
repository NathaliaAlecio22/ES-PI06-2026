"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const scrypt = (0, node_util_1.promisify)(node_crypto_1.scrypt);
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const derivedKey = (await scrypt(password, salt, 64));
    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}
async function verifyPassword(password, storedHash) {
    const separator = storedHash.includes(":") ? ":" : "$";
    const [algorithm, salt, hash] = storedHash.split(separator);
    if (algorithm !== "scrypt" ||
        !salt ||
        !/^[a-f0-9]{32}$/i.test(salt) ||
        !hash ||
        !/^[a-f0-9]{128}$/i.test(hash)) {
        return false;
    }
    const saltValue = separator === "$" ? Buffer.from(salt, "hex") : salt;
    const derivedKey = (await scrypt(password, saltValue, 64));
    const storedKey = Buffer.from(hash, "hex");
    return (0, node_crypto_1.timingSafeEqual)(derivedKey, storedKey);
}
