import { dbPool } from "./client.js";
import { resetDatabaseState } from "./seed.js";
import { createClient } from "redis";

async function run() {
  await resetDatabaseState();
  console.info("[db:clear] all tables truncated");

  const redisUrl =
    process.env.REDIS_URL?.trim() || "redis://:qwertyuiop@localhost:6379/0";
  try {
    const redis = createClient({ url: redisUrl });
    await redis.connect();
    await redis.flushDb();
    await redis.disconnect();
    console.info("[db:clear] redis flushed");
  } catch (error) {
    console.warn("[db:clear] redis flush skipped:", (error as Error).message);
  }

  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
