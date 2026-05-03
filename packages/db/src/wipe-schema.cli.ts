import { dbPool } from "./client.js";
import { flushRedisIfConfigured, wipePublicSchemaForMigration } from "./wipe-schema.js";

async function run() {
  await wipePublicSchemaForMigration();
  console.info("[db:wipe-schema] public and drizzle schemas recreated");
  await flushRedisIfConfigured();
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
