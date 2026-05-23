import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ensureDbEnvLoaded } from "./env.js";
import * as schema from "./schema.js";

ensureDbEnvLoaded();

/**
 * 数据库连接 URL。
 *
 * 生产环境中必须通过 DATABASE_URL 环境变量配置，禁止硬编码凭据。
 * 本地开发请在 .env 中设置 DATABASE_URL。
 */
const databaseUrl = process.env.DATABASE_URL?.trim();

// 测试环境下可能未配置 DATABASE_URL，允许延迟报错（实际查询时才会失败）
if (!databaseUrl && process.env.NODE_ENV !== "test") {
  throw new Error(
    "DATABASE_URL is not set. Please configure it in your .env file. " +
    "Example: postgres://user:your_password@localhost:5432/feijia"
  );
}

const globalCache = globalThis as typeof globalThis & {
  __feijiaDbPool?: Pool;
};

export const dbPool =
  globalCache.__feijiaDbPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

if (!globalCache.__feijiaDbPool) {
  globalCache.__feijiaDbPool = dbPool;
}

export const db = drizzle(dbPool, { schema });
