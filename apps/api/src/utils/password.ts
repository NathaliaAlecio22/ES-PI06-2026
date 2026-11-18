import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const separator = storedHash.includes(":") ? ":" : "$";
  const [algorithm, salt, hash] = storedHash.split(separator);

  if (
    algorithm !== "scrypt" ||
    !salt ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !hash ||
    !/^[a-f0-9]{128}$/i.test(hash)
  ) {
    return false;
  }

  const saltValue = separator === "$" ? Buffer.from(salt, "hex") : salt;
  const derivedKey = (await scrypt(password, saltValue, 64)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");

  return timingSafeEqual(derivedKey, storedKey);
}