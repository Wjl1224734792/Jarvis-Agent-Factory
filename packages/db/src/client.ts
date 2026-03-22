import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://user:qwertyuiop@localhost:5432/feijia";

const globalCache = globalThis as typeof globalThis & {
  __feijiaDbPool?: Pool;
};

export const dbPool =
  globalCache.__feijiaDbPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10
  });

if (!globalCache.__feijiaDbPool) {
  globalCache.__feijiaDbPool = dbPool;
}

export const db = drizzle(dbPool, { schema });
