import { dbPool } from "./client.js";
import { seedBaseDatabase } from "./seed.js";

async function run() {
  await seedBaseDatabase({
    reset: false
  });
  await dbPool.end();
}

run().catch(async (error) => {
  console.error(error);
  await dbPool.end();
  process.exit(1);
});
