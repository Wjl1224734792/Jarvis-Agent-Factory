import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db } from "./client.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(currentDirectory, "../drizzle");

export async function runMigrations() {
  const tables = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('aircraft_categories', 'aircraft_models', 'aircraft_submissions')
  `);

  const hasCoreTables = tables.rows.length > 0;

  if (!hasCoreTables) {
    await migrate(db, {
      migrationsFolder
    });
  }

  await db.execute(sql.raw(`
    ALTER TABLE "aircraft_models"
      ADD COLUMN IF NOT EXISTS "price_min" integer,
      ADD COLUMN IF NOT EXISTS "price_max" integer;

    ALTER TABLE "aircraft_submissions"
      ADD COLUMN IF NOT EXISTS "price_min" integer,
      ADD COLUMN IF NOT EXISTS "price_max" integer;
  `));
}
