import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db } from "./client.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(currentDirectory, "../drizzle");

async function dropPublicForeignKeys() {
  await db.execute(
    sql.raw(`
      DO $$
      DECLARE fk record;
      BEGIN
        FOR fk IN
          SELECT
            quote_ident(ns.nspname) || '.' || quote_ident(tbl.relname) AS table_name,
            con.conname AS constraint_name
          FROM pg_constraint con
          INNER JOIN pg_class tbl ON tbl.oid = con.conrelid
          INNER JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
          WHERE con.contype = 'f'
            AND ns.nspname = 'public'
        LOOP
          EXECUTE format(
            'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
            fk.table_name,
            fk.constraint_name
          );
        END LOOP;
      END $$;
    `)
  );
}

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder
  });
  await dropPublicForeignKeys();
}
