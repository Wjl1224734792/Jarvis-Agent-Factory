import { dbPool } from "./client.js";
import { seedDatabase } from "./seed.js";

async function run() {
  await seedDatabase();
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
