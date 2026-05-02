import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/feijia",
      max: 20,
    });
  }
  return pool;
}

export const db = drizzle({ client: getPool() });
export const dbPool = getPool;
