import { dbPool } from "./client.js";
import { seedMockTestDataDatabase } from "./seed.test-data.js";

async function run() {
  await seedMockTestDataDatabase();
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
