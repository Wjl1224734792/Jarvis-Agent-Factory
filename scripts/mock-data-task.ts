const LOCAL_DATABASE_URL =
  "postgres://feijia_dev:F3j%21a_D3v_2026%23pg@localhost:5432/feijia";
const LOCAL_REDIS_URL = "redis://:F3j%21a_D3v_2026%23rd@localhost:6379/0";
const LOCAL_STORAGE_ENDPOINT = "http://localhost:9000";
const LOCAL_STORAGE_REGION = "us-east-1";
const LOCAL_STORAGE_BUCKET = "feijia-media";
const LOCAL_STORAGE_ACCESS_KEY_ID = "minioadmin";
const LOCAL_STORAGE_SECRET_ACCESS_KEY = "minioadmin123";

export type MockDataTask = "seed" | "reset" | "setup";

export function buildMockDataCommands(task: MockDataTask): string[][] {
  if (task === "seed") {
    return [["bun", "run", "--cwd", "packages/db", "seed:mock"]];
  }

  if (task === "reset") {
    return [
      ["bun", "run", "--cwd", "packages/db", "wipe-schema"],
      ["bun", "run", "--cwd", "packages/db", "migrate"],
      ["bun", "run", "--cwd", "packages/db", "seed:mock"]
    ];
  }

  return [
    ["bun", "run", "infra:up"],
    ...buildMockDataCommands("reset")
  ];
}

export function buildMockDataEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    DATABASE_URL: baseEnv.MOCK_DATABASE_URL?.trim() || LOCAL_DATABASE_URL,
    REDIS_URL: baseEnv.MOCK_REDIS_URL?.trim() || LOCAL_REDIS_URL,
    STORAGE_PROVIDER: "minio",
    STORAGE_BUCKET: baseEnv.MOCK_STORAGE_BUCKET?.trim() || LOCAL_STORAGE_BUCKET,
    STORAGE_ENDPOINT: baseEnv.MOCK_STORAGE_ENDPOINT?.trim() || LOCAL_STORAGE_ENDPOINT,
    STORAGE_REGION: baseEnv.MOCK_STORAGE_REGION?.trim() || LOCAL_STORAGE_REGION,
    STORAGE_ACCESS_KEY_ID:
      baseEnv.MOCK_STORAGE_ACCESS_KEY_ID?.trim() || LOCAL_STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY:
      baseEnv.MOCK_STORAGE_SECRET_ACCESS_KEY?.trim() || LOCAL_STORAGE_SECRET_ACCESS_KEY,
    STORAGE_FORCE_PATH_STYLE: "true",
    STORAGE_AUTO_CREATE_BUCKET: "true",
    SMS_PROVIDER: "mock",
    SMS_EXPOSE_MOCK_CODE: "true"
  };
}
