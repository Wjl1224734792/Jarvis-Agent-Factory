import { createHash, randomBytes, randomUUID } from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function createSecretToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
