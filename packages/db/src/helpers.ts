import { createHash, randomUUID } from "node:crypto";

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
