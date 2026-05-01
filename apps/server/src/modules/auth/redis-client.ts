import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
  }
  return client;
}
