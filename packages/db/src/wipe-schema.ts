import { sql } from "drizzle-orm";
import { createClient } from "redis";
import { db } from "./client.js";

/**
 * 删除并重建 `public`  schema，使 `db:migrate` 能在任意脏状态下从头应用迁移。
 * 用于 `db:reset:*`，替代仅 TRUNCATE 的 `db:clear`（后者会保留表结构，易导致迁移与结构不一致）。
 */
export async function wipePublicSchemaForMigration(): Promise<void> {
  await db.execute(
    sql.raw(`
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
