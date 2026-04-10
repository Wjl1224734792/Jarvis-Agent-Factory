import { defineConfig, devices } from "playwright/test";

const webBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const serverBaseUrl = process.env.E2E_SERVER_BASE_URL ?? "http://localhost:3002";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  outputDir: "tmp/playwright/test-results",
  reporter: [["list"], ["html", { outputFolder: "tmp/playwright/report", open: "never" }]],
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "bun run dev:server",
      url: `${serverBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: "bun run dev:web",
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
