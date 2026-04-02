import { createClient, type RedisClientType } from "redis";

const redisUrl =
  process.env.REDIS_URL?.trim() || "redis://:qwertyuiop@localhost:6379/0";

export const redis: RedisClientType = createClient({ url: redisUrl });

let connected = false;

export async function ensureRedisConnected() {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}

export async function resetRedisForTesting() {
  await ensureRedisConnected();
  await redis.flushDb();
}
