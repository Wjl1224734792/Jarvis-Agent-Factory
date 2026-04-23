import { fileURLToPath } from "node:url";

import { buildMockDataCommands, buildMockDataEnv } from "./mock-data-task.ts";

const workspaceRoot = new URL("../", import.meta.url);
const cwd = fileURLToPath(workspaceRoot);

async function runCommand(command, env) {
  const child = Bun.spawn(command, {
    cwd,
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit"
  });

  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}`);
  }
}

async function main() {
  const task = process.argv[2];
  if (task !== "seed" && task !== "reset" && task !== "setup") {
    throw new Error('Usage: bun run ./scripts/run-mock-db-task.mjs <seed|reset|setup>');
  }

  const env = buildMockDataEnv(process.env);
  for (const command of buildMockDataCommands(task)) {
    await runCommand(command, env);
  }
}

await main();
