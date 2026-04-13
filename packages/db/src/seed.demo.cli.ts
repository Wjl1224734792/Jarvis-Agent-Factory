import { dbPool } from "./client.js";
import { seedDemoDatabase } from "./seed.js";

async function run() {
  await seedDemoDatabase({
    reset: false
  });
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
