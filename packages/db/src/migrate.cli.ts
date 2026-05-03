import { dbPool } from "./client.js";
import { runMigrations } from "./migrate.js";

async function run() {
  await runMigrations();
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
