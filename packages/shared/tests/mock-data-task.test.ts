import { describe, expect, it } from "vitest";

import { buildMockDataCommands, buildMockDataEnv } from "../../../scripts/mock-data-task";

describe("mock data task helpers", () => {
  it("forces mock data tasks to use local test infrastructure by default", () => {
    const env = buildMockDataEnv({
      DATABASE_URL: "postgres://remote.example.com/prod",
      REDIS_URL: "redis://remote.example.com/0",
      STORAGE_PROVIDER: "kodo",
      STORAGE_ENDPOINT: "https://up-z2.qiniup.com"
    });

    expect(env.DATABASE_URL).toBe("postgres://feijia_dev:F3j%21a_D3v_2026%23pg@localhost:5432/feijia");
    expect(env.REDIS_URL).toBe("redis://:F3j%21a_D3v_2026%23rd@localhost:6379/0");
    expect(env.STORAGE_PROVIDER).toBe("minio");
    expect(env.STORAGE_ENDPOINT).toBe("http://localhost:9000");
    expect(env.STORAGE_FORCE_PATH_STYLE).toBe("true");
    expect(env.SMS_PROVIDER).toBe("mock");
  });

  it("allows explicit mock overrides for custom local ports", () => {
    const env = buildMockDataEnv({
      MOCK_DATABASE_URL: "postgres://local-test-db:5433/feijia_test",
      MOCK_REDIS_URL: "redis://localhost:6380/0",
      MOCK_STORAGE_ENDPOINT: "http://localhost:9010"
    });

    expect(env.DATABASE_URL).toBe("postgres://local-test-db:5433/feijia_test");
    expect(env.REDIS_URL).toBe("redis://localhost:6380/0");
    expect(env.STORAGE_ENDPOINT).toBe("http://localhost:9010");
  });

  it("maps setup/reset/seed to the expected command chain", () => {
    expect(buildMockDataCommands("seed")).toEqual([["bun", "run", "--cwd", "packages/db", "seed:mock"]]);
    expect(buildMockDataCommands("reset")).toEqual([
      ["bun", "run", "--cwd", "packages/db", "wipe-schema"],
      ["bun", "run", "--cwd", "packages/db", "migrate"],
      ["bun", "run", "--cwd", "packages/db", "seed:mock"]
    ]);
    expect(buildMockDataCommands("setup")).toEqual([
      ["bun", "run", "infra:up"],
      ["bun", "run", "--cwd", "packages/db", "wipe-schema"],
      ["bun", "run", "--cwd", "packages/db", "migrate"],
      ["bun", "run", "--cwd", "packages/db", "seed:mock"]
    ]);
  });
});
