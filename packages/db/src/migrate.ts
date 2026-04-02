import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db } from "./client.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(currentDirectory, "../drizzle");

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder
  });
}
