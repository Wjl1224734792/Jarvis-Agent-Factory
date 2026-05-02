import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
  }
  return client;
}

export async function ensureRedisConnected() {
  const c = getClient();
  if (!c.isOpen) await c.connect();
}

export const redis = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (...args: unknown[]) => {
      const c = getClient();
      return (c as any)[prop](...args);
    };
  },
});
