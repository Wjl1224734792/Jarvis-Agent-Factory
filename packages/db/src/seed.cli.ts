import { dbPool } from "./client.js";
import { seedDatabase } from "./seed.js";
import { seedRuntimeArtifacts } from "./runtime-seed.js";

async function run() {
  await seedDatabase();
  const summary = await seedRuntimeArtifacts();
  console.info("[db:seed] runtime artifacts", summary);
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
