import { sql } from "drizzle-orm";
import { createClient } from "redis";
import { db } from "./client.js";

/**
 * Rebuild all schemas touched by local migrations so the next `db:migrate`
 * truly replays from scratch instead of reusing stale Drizzle metadata.
 */
export async function wipePublicSchemaForMigration(): Promise<void> {
  await db.execute(
    sql.raw(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public AUTHORIZATION CURRENT_USER;
      GRANT ALL ON SCHEMA public TO public;
    `)
  );
}

export async function flushRedisIfConfigured(): Promise<void> {
  const redisUrl =
    process.env.REDIS_URL?.trim() || "redis://:qwertyuiop@localhost:6379/0";
  try {
    const redis = createClient({ url: redisUrl });
    await redis.connect();
    await redis.flushDb();
    await redis.disconnect();
    console.info("[db:wipe-schema] redis flushed");
  } catch (error) {
    console.warn("[db:wipe-schema] redis flush skipped:", (error as Error).message);
  }
}
