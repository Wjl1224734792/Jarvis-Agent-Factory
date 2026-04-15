/* global Bun, URL, fetch, process */
import { fileURLToPath } from "node:url";

const workspaceRoot = new URL("../", import.meta.url);
const cwd = fileURLToPath(workspaceRoot);

function processEnv() {
  return {
    ...process.env,
    E2E_BASE_URL: process.env.E2E_BASE_URL ?? "http://localhost:17380",
    E2E_ADMIN_BASE_URL: process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:17381",
    E2E_SERVER_BASE_URL: process.env.E2E_SERVER_BASE_URL ?? "http://localhost:17382"
  };
}

async function runCommand(command, label) {
  const child = Bun.spawn(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: processEnv()
  });

  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`);
  }
}

async function isUrlReady(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForUrls(urls, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const statuses = await Promise.all(urls.map((url) => isUrlReady(url)));
    if (statuses.every(Boolean)) {
      return;
    }

    await Bun.sleep(2_000);
  }

  throw new Error(`Timed out waiting for dev servers: ${urls.join(", ")}`);
}

function startManagedProcess(command) {
  return Bun.spawn(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "ignore",
    env: processEnv()
  });
}

async function ensureDevServers() {
  const webBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:17380";
  const adminBaseUrl = process.env.E2E_ADMIN_BASE_URL ?? "http://localhost:17381";
  const serverBaseUrl = process.env.E2E_SERVER_BASE_URL ?? "http://localhost:17382";
  const urls = [
    `${serverBaseUrl}/health`,
    webBaseUrl,
    `${adminBaseUrl}/admin/login`
  ];

  const existing = await Promise.all(urls.map((url) => isUrlReady(url)));
  if (existing.every(Boolean)) {
    return [];
  }

  const processes = [
    startManagedProcess(["bun", "run", "dev:server"]),
    startManagedProcess(["bun", "run", "dev:web"]),
    startManagedProcess(["bun", "run", "dev:admin"])
  ];

  try {
    await waitForUrls(urls, 240_000);
    return processes;
  } catch (error) {
    for (const child of processes) {
      child.kill();
    }
    throw error;
  }
}

async function main() {
  await runCommand(["bun", "run", "infra:up"], "infra:up");
  await runCommand(["bun", "run", "db:reset:mock"], "db:reset:mock");

  const managedProcesses = await ensureDevServers();

  try {
    await runCommand(["bunx", "playwright", "test", ...process.argv.slice(2)], "playwright test");
  } finally {
    for (const child of managedProcesses) {
      child.kill();
    }
  }
}

await main();
